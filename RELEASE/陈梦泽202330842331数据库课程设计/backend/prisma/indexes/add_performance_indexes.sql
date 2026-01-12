-- 添加性能优化索引

-- Orders表索引
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_status_created ON orders(merchant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_driver_id ON orders(delivery_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_id ON orders(warehouse_id);

-- LogisticsTimeline表索引
CREATE INDEX IF NOT EXISTS idx_logistics_timeline_order_id ON logistics_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_timeline_timestamp ON logistics_timeline(timestamp);
CREATE INDEX IF NOT EXISTS idx_logistics_timeline_order_timestamp ON logistics_timeline(order_id, timestamp);

-- CustomerReviews表索引
CREATE INDEX IF NOT EXISTS idx_customer_reviews_order_id ON customer_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_rating ON customer_reviews(rating);

-- OrderExceptions表索引
CREATE INDEX IF NOT EXISTS idx_order_exceptions_order_id ON order_exceptions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_exceptions_exception_type ON order_exceptions(exception_type);
CREATE INDEX IF NOT EXISTS idx_order_exceptions_handle_status ON order_exceptions(handle_status);

-- DeliveryDrivers表索引
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_status ON delivery_drivers(status);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_vehicle_id ON delivery_drivers(vehicle_id);

-- Warehouses表索引
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status);

