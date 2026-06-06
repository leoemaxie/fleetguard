CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

SELECT create_hypertable('gps_events', 'ts', if_not_exists => TRUE, chunk_time_interval => INTERVAL '7 days');
SELECT create_hypertable('fuel_events', 'ts', if_not_exists => TRUE, chunk_time_interval => INTERVAL '7 days');
