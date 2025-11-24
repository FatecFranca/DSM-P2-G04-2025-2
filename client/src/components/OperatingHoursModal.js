import React from 'react';
import { FaClock, FaTimes } from 'react-icons/fa';
import './OperatingHoursModal.css';

const OperatingHoursModal = ({ isOpen, onClose, operatingHours }) => {
  if (!isOpen) return null;

  const getDayName = (dayOfWeek) => {
    const days = [
      'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
      'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];
    return days[dayOfWeek] || `Dia ${dayOfWeek}`;
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5); // Remove segundos se houver
  };

  // Ordenar os dias da semana começando pelo domingo (0)
  const sortedHours = [...operatingHours].sort((a, b) => a.day_of_week - b.day_of_week);

  return (
    <div className="operating-hours-modal-overlay" onClick={onClose}>
      <div className="operating-hours-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className="operating-hours-modal-header">
          <FaClock className="clock-icon" />
          <h2>Horários de Funcionamento</h2>
        </div>
        
        <div className="operating-hours-modal-body">
          {sortedHours.map((hour) => (
            <div key={hour.day_of_week} className="day-hours-row">
              <div className="day-name">{getDayName(hour.day_of_week)}</div>
              <div className="day-hours">
                {hour.is_closed ? (
                  <span className="closed-status">Fechado</span>
                ) : (
                  <span className="open-hours">
                    {formatTime(hour.open_time)} - {formatTime(hour.close_time)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="operating-hours-modal-footer">
          <p>Todos os horários estão no fuso UTC-3 (Horário de Brasília)</p>
        </div>
      </div>
    </div>
  );
};

export default OperatingHoursModal;