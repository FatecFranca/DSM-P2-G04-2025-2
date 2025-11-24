USAR POSTGRES

PARA O BANCO RODAR COMPLETAMENTE É NECESSARIO BAIXAR O POSTGIS
NO STACKBUILDER DO POSTGRES

APÓS INSTALADO execute a query:
CREATE EXTENSION postgis;

VERIFICAR SE JÁ TEM HSTORE SE NÃO É NECESSARIO BAIXAR TAMBÉM NO
STACKBUILD DO POSTGRES
CREATE EXTENSION hstore;

APÓS ISSO BASTA RESTAURAR O BANCO(bancoFinal.sql)


Com o banco já restaurado precisamos apenas:

npm install na pasta raiz do projeto

após precisamos ir até a pasta clint:

cd client
npm install

Feito isso já podemos subir o projeto

cd client
npm start

cd server
npm start


CONTA ADMIN:

Admin
100342