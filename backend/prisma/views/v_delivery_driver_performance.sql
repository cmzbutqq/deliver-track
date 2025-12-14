-- 配送员绩效视图
-- 包含: 配送员ID、姓名、完成订单数、平均评分、准时率、平均配送时长

CREATE OR REPLACE VIEW v_delivery_driver_performance AS
SELECT 
  d.id AS driver_id,
  d.name AS driver_name,
  d.phone AS driver_phone,
  d.license_number,
  d.status,
  d.total_orders,
  d.avg_rating,
  d.on_time_rate,
  COUNT(o.id) AS assigned_orders,
  COUNT(CASE WHEN o.status = 'DELIVERED' THEN o.id END) AS completed_orders,
  COALESCE(
    AVG(CASE 
      WHEN o.status = 'DELIVERED' AND o.actual_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (o.actual_time - o.created_at)) / 3600
    END),
    0
  ) AS avg_delivery_time_hours,
  v.plate_number AS vehicle_plate_number,
  v.vehicle_type
FROM delivery_drivers d
LEFT JOIN orders o ON d.id = o.delivery_driver_id
LEFT JOIN vehicles v ON d.vehicle_id = v.id
GROUP BY d.id, d.name, d.phone, d.license_number, d.status, d.total_orders, d.avg_rating, d.on_time_rate, v.plate_number, v.vehicle_type;

