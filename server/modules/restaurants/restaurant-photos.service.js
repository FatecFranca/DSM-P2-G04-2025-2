const pool = require('../../config/database');

class RestaurantPhotosService {
  // Buscar todas as fotos de um restaurante
  async getRestaurantPhotos(restaurantId) {
    const result = await pool.query(
      `SELECT id, photo_url, photo_order, caption, created_at
       FROM restaurant_photos 
       WHERE restaurant_id = $1 
       ORDER BY photo_order ASC, created_at ASC`,
      [restaurantId]
    );
    return result.rows;
  }



  // Adicionar nova foto ao restaurante
  async addPhoto(restaurantId, photoData) {
    const { photo_url, caption } = photoData;

    // Determinar a ordem da nova foto
    const orderResult = await pool.query(
      `SELECT COALESCE(MAX(photo_order), -1) + 1 as next_order
       FROM restaurant_photos 
       WHERE restaurant_id = $1`,
      [restaurantId]
    );
    const photo_order = orderResult.rows[0].next_order;

    // Inserir nova foto
    const result = await pool.query(
      `INSERT INTO restaurant_photos (restaurant_id, photo_url, photo_order, caption)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [restaurantId, photo_url, photo_order, caption]
    );
    
    // Se esta for a primeira foto (photo_order = 0), promovê-la como principal
    if (result.rows[0] && result.rows[0].photo_order === 0) {
      await pool.query(
        `UPDATE restaurants SET main_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [result.rows[0].photo_url, restaurantId]
      );
    }

    return result.rows[0];
  }

  // Atualizar foto existente
  async updatePhoto(photoId, updateData) {
    const { photo_url, caption, photo_order } = updateData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Buscar restaurante da foto
      const existingPhotoResult = await client.query(
        `SELECT restaurant_id, photo_order AS old_order FROM restaurant_photos WHERE id = $1`,
        [photoId]
      );
      if (existingPhotoResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const { restaurant_id: restaurantId, old_order: oldOrder } = existingPhotoResult.rows[0];

      // Se a atualização colocar esta foto como ordem 0, empurrar as demais para baixo
      if (photo_order !== undefined && photo_order !== null && Number(photo_order) === 0) {
        await client.query(
          `UPDATE restaurant_photos
           SET photo_order = photo_order + 1
           WHERE restaurant_id = $1 AND id <> $2 AND photo_order >= 0`,
          [restaurantId, photoId]
        );
      }

      // Atualizar a foto
      const updatedResult = await client.query(
        `UPDATE restaurant_photos 
         SET photo_url = COALESCE($2, photo_url),
             caption = COALESCE($3, caption),
             photo_order = COALESCE($4, photo_order),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [photoId, photo_url, caption, photo_order]
      );

      const updatedPhoto = updatedResult.rows[0];

      // Se após a atualização a foto estiver em ordem 0, definir como principal
      if (updatedPhoto && updatedPhoto.photo_order === 0) {
        await client.query(
          `UPDATE restaurants SET main_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [updatedPhoto.photo_url, restaurantId]
        );
      } else if (oldOrder === 0) {
        // Caso a foto tenha deixado de ser principal, garantir que a principal atual seja a primeira da ordenação
        const mainResult = await client.query(
          `SELECT photo_url FROM restaurant_photos WHERE restaurant_id = $1 ORDER BY photo_order ASC, created_at ASC LIMIT 1`,
          [restaurantId]
        );
        const newMainUrl = mainResult.rows.length > 0 ? mainResult.rows[0].photo_url : null;
        await client.query(
          `UPDATE restaurants SET main_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [newMainUrl, restaurantId]
        );
      }

      await client.query('COMMIT');
      return updatedPhoto || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Remover foto
  async deletePhoto(photoId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obter dados antes de deletar
      const existing = await client.query(
        `SELECT id, restaurant_id, photo_order FROM restaurant_photos WHERE id = $1`,
        [photoId]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const { restaurant_id: restaurantId, photo_order: deletedOrder } = existing.rows[0];

      const result = await client.query(
        `DELETE FROM restaurant_photos WHERE id = $1 RETURNING *`,
        [photoId]
      );

      // Se deletou a principal, atualizar principal para a próxima
      if (deletedOrder === 0) {
        const nextMain = await client.query(
          `SELECT photo_url FROM restaurant_photos WHERE restaurant_id = $1 ORDER BY photo_order ASC, created_at ASC LIMIT 1`,
          [restaurantId]
        );
        const nextUrl = nextMain.rows.length > 0 ? nextMain.rows[0].photo_url : null;
        await client.query(
          `UPDATE restaurants SET main_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [nextUrl, restaurantId]
        );
      }

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Reordenar fotos
  async reorderPhotos(restaurantId, photoOrder) {
    // photoOrder deve ser um array de IDs na ordem desejada
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < photoOrder.length; i++) {
        await client.query(
          `UPDATE restaurant_photos 
           SET photo_order = $1 
           WHERE id = $2 AND restaurant_id = $3`,
          [i, photoOrder[i], restaurantId]
        );
      }
      
      // Atualizar foto principal com base na primeira da ordem
      if (photoOrder.length > 0) {
        const firstPhoto = await client.query(
          `SELECT photo_url FROM restaurant_photos WHERE id = $1 AND restaurant_id = $2`,
          [photoOrder[0], restaurantId]
        );
        if (firstPhoto.rows.length > 0) {
          await client.query(
            `UPDATE restaurants SET main_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [firstPhoto.rows[0].photo_url, restaurantId]
          );
        }
      }

      await client.query('COMMIT');
      
      // Retornar fotos reordenadas
      return await this.getRestaurantPhotos(restaurantId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }



  // Contar fotos de um restaurante
  async getPhotoCount(restaurantId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM restaurant_photos WHERE restaurant_id = $1`,
      [restaurantId]
    );
    return parseInt(result.rows[0].count);
  }

  // Buscar fotos com paginação
  async getRestaurantPhotosPaginated(restaurantId, limit = 10, offset = 0) {
    const result = await pool.query(
      `SELECT id, photo_url, photo_order, caption, created_at
       FROM restaurant_photos 
       WHERE restaurant_id = $1 
       ORDER BY photo_order ASC, created_at ASC
       LIMIT $2 OFFSET $3`,
      [restaurantId, limit, offset]
    );
    return result.rows;
  }
}

module.exports = new RestaurantPhotosService();

