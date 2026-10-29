#!/bin/bash
# Se ejecuta una sola vez, al crear el volumen. Da al usuario de la app acceso a:
#  - las shadow databases que `prisma migrate dev` crea y borra (prisma_migrate_shadow_db_*)
#  - la base de los tests de integración (<MYSQL_DATABASE>_test)
set -euo pipefail

mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\`;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\\_test\`.* TO '${MYSQL_USER}'@'%';
GRANT ALL PRIVILEGES ON \`prisma\\_migrate\\_shadow\\_db\\_%\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
