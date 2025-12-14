-- 配送员排班视图
-- 包含: 配送员信息 + 本周排班情况 + 工作量统计

CREATE OR REPLACE VIEW v_driver_schedule_summary AS
SELECT
  d.id AS driver_id,
  d.name AS driver_name,
  d.phone AS driver_phone,
  d.status AS driver_status,
  d.total_orders,
  d.avg_rating,
  d.on_time_rate,
  COUNT(DISTINCT ds.id) AS scheduled_days,
  COUNT(DISTINCT CASE WHEN ds.work_date >= CURRENT_DATE THEN ds.id END) AS upcoming_schedules,
  COUNT(DISTINCT CASE WHEN ds.status = 'CHECKED_IN' THEN ds.id END) AS checked_in_count,
  STRING_AGG(
    DISTINCT TO_CHAR(ds.work_date, 'YYYY-MM-DD') || ' ' || ds.shift_type::text,
    ', '
  ) AS schedule_list
FROM delivery_drivers d
LEFT JOIN driver_schedules ds ON d.id = ds.driver_id
  AND ds.work_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY d.id, d.name, d.phone, d.status, d.total_orders, d.avg_rating, d.on_time_rate;

