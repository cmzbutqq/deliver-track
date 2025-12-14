-- 订单追踪详情视图
-- 包含: 订单信息 + 时间线记录 + 配送员信息 + 仓库信息

CREATE OR REPLACE VIEW v_order_tracking_detail AS
SELECT 
  o.id AS order_id,
  o."orderNo",
  o.status AS order_status,
  o.receiver_name,
  o.receiver_phone,
  o.receiver_address,
  o.product_name,
  o.product_quantity,
  o.amount,
  o.origin,
  o.destination,
  o.current_location,
  o.estimated_time,
  o.actual_time,
  o.logistics,
  o.created_at AS order_created_at,
  o.updated_at AS order_updated_at,
  -- 配送员信息
  d.id AS driver_id,
  d.name AS driver_name,
  d.phone AS driver_phone,
  d.status AS driver_status,
  -- 仓库信息
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  -- 费用信息
  df.total_fee,
  df.base_fee,
  df.urgent_fee,
  df.insurance_fee,
  df.distance_fee,
  df.weight_fee,
  -- 商家信息
  m.id AS merchant_id,
  m.username AS merchant_username,
  m.name AS merchant_name
FROM orders o
LEFT JOIN delivery_drivers d ON o.delivery_driver_id = d.id
LEFT JOIN warehouses w ON o.warehouse_id = w.id
LEFT JOIN delivery_fees df ON o.id = df.order_id
LEFT JOIN merchants m ON o.merchant_id = m.id;

