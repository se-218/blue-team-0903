#!/bin/bash
set -e

DATADIR=/var/lib/mysql

if [ ! -d "$DATADIR/campus_db" ]; then
  echo "[entrypoint] first boot: initializing MySQL data dir + schema"

  if [ ! -d "$DATADIR/mysql" ]; then
    mysqld --initialize-insecure --user=mysql --datadir="$DATADIR"
  fi

  mysqld --user=mysql --datadir="$DATADIR" --skip-networking=0 --bind-address=127.0.0.1 &
  MYSQL_PID=$!

  until mysqladmin ping -h127.0.0.1 --silent 2>/dev/null; do
    sleep 1
  done

  # MySQL 8.4+ 預設停用 mysql_native_password 外掛，改用預設(caching_sha2_password)即可，
  # mysql2 npm套件支援，不需要強制指定舊外掛
  mysql -uroot <<-'SQL'
    CREATE DATABASE IF NOT EXISTS campus_db;
    CREATE USER IF NOT EXISTS 'campus'@'%' IDENTIFIED BY 'campus';
    GRANT ALL PRIVILEGES ON campus_db.* TO 'campus'@'%';
    CREATE USER IF NOT EXISTS 'grader'@'localhost' IDENTIFIED BY 'grader_ro_9f3a2b';
    GRANT SELECT ON campus_db.* TO 'grader'@'localhost';
    ALTER USER 'root'@'localhost' IDENTIFIED BY 'campus_root';
    FLUSH PRIVILEGES;
SQL

  mysql --default-character-set=utf8mb4 -uroot -pcampus_root campus_db < /opt/db/schema.sql
  mysql --default-character-set=utf8mb4 -uroot -pcampus_root campus_db < /opt/db/seed.sql

  mysqladmin -uroot -pcampus_root shutdown
  wait "$MYSQL_PID" 2>/dev/null || true

  echo "[entrypoint] schema + seed loaded"
fi

exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
