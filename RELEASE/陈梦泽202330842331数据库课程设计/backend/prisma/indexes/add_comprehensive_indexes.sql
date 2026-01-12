-- 全面索引优化SQL脚本
-- 为所有常用查询字段添加索引，提升查询性能

-- ============================================
-- Orders表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_address_id ON orders(customer_address_id);
CREATE INDEX IF NOT EXISTS idx_orders_amount ON orders(amount);
CREATE INDEX IF NOT EXISTS idx_orders_estimated_time ON orders(estimated_time);
CREATE INDEX IF NOT EXISTS idx_orders_actual_time ON orders(actual_time);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);

-- ============================================
-- Products表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- ============================================
-- Customers表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- ============================================
-- CustomerAddresses表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customer_addresses_is_default ON customer_addresses(is_default);

-- ============================================
-- DeliveryZones表补充索引
-- ============================================
-- merchant_id已有外键索引，无需额外添加

-- ============================================
-- Routes表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at);

-- ============================================
-- LogisticsCompanies表补充索引
-- ============================================
-- name已有唯一索引，无需额外添加

-- ============================================
-- Vehicles表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_maintenance_date ON vehicles(last_maintenance_date);

-- ============================================
-- Warehouses表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name);
CREATE INDEX IF NOT EXISTS idx_warehouses_current_stock ON warehouses(current_stock);

-- ============================================
-- DeliveryDrivers表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_name ON delivery_drivers(name);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_phone ON delivery_drivers(phone);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_total_orders ON delivery_drivers(total_orders);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_avg_rating ON delivery_drivers(avg_rating);

-- ============================================
-- CustomerReviews表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customer_reviews_created_at ON customer_reviews(created_at);

-- ============================================
-- OrderExceptions表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_order_exceptions_created_at ON order_exceptions(created_at);
CREATE INDEX IF NOT EXISTS idx_order_exceptions_handle_time ON order_exceptions(handle_time);

-- ============================================
-- DeliveryFees表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_delivery_fees_total_fee ON delivery_fees(total_fee);
CREATE INDEX IF NOT EXISTS idx_delivery_fees_created_at ON delivery_fees(created_at);

-- ============================================
-- Suppliers表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_credit_level ON suppliers(credit_level);

-- ============================================
-- DeliveryRoutes表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_destination_region ON delivery_routes(destination_region);

-- ============================================
-- DeliveryZoneDrivers表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_delivery_zone_drivers_zone_id ON delivery_zone_drivers(zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zone_drivers_driver_id ON delivery_zone_drivers(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zone_drivers_priority ON delivery_zone_drivers(priority);

-- ============================================
-- FeeSettlements表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fee_settlements_status ON fee_settlements(status);
CREATE INDEX IF NOT EXISTS idx_fee_settlements_start_date ON fee_settlements(start_date);
CREATE INDEX IF NOT EXISTS idx_fee_settlements_end_date ON fee_settlements(end_date);
CREATE INDEX IF NOT EXISTS idx_fee_settlements_settled_at ON fee_settlements(settled_at);

-- ============================================
-- FeeSettlementDetails表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fee_settlement_details_settlement_id ON fee_settlement_details(settlement_id);
CREATE INDEX IF NOT EXISTS idx_fee_settlement_details_fee_type ON fee_settlement_details(fee_type);

-- ============================================
-- DriverSchedules表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_driver_schedules_status ON driver_schedules(status);

-- ============================================
-- VehicleMaintenances表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_vehicle_id ON vehicle_maintenances(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_maintenance_type ON vehicle_maintenances(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_maintenance_date ON vehicle_maintenances(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_next_maintenance_date ON vehicle_maintenances(next_maintenance_date);

-- ============================================
-- WarehouseTransactions表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_order_id ON warehouse_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_transaction_type ON warehouse_transactions(transaction_type);

-- ============================================
-- DriverPerformanceStats表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_driver_performance_stats_stat_date ON driver_performance_stats(stat_date);

-- ============================================
-- MerchantStatistics表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_merchant_statistics_stat_date ON merchant_statistics(stat_date);

-- ============================================
-- OrderItems表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON order_items(created_at);

-- ============================================
-- DeliveryTasks表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_task_type ON delivery_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_priority ON delivery_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_assigned_at ON delivery_tasks(assigned_at);
CREATE INDEX IF NOT EXISTS idx_delivery_tasks_completed_at ON delivery_tasks(completed_at);

-- ============================================
-- DeliveryPromises表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_delivery_promises_promised_delivery_time ON delivery_promises(promised_delivery_time);
CREATE INDEX IF NOT EXISTS idx_delivery_promises_actual_delivery_time ON delivery_promises(actual_delivery_time);
CREATE INDEX IF NOT EXISTS idx_delivery_promises_is_on_time ON delivery_promises(is_on_time);

-- ============================================
-- Payments表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount);

-- ============================================
-- Refunds表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_refunds_refund_amount ON refunds(refund_amount);
CREATE INDEX IF NOT EXISTS idx_refunds_processed_at ON refunds(processed_at);

-- ============================================
-- CustomerPoints表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customer_points_total_points ON customer_points(total_points);
CREATE INDEX IF NOT EXISTS idx_customer_points_available_points ON customer_points(available_points);

-- ============================================
-- Complaints表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_type ON complaints(complaint_type);
CREATE INDEX IF NOT EXISTS idx_complaints_handler_id ON complaints(handler_id);
CREATE INDEX IF NOT EXISTS idx_complaints_handled_at ON complaints(handled_at);

-- ============================================
-- Coupons表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coupons_valid_from ON coupons(valid_from);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_to ON coupons(valid_to);
CREATE INDEX IF NOT EXISTS idx_coupons_used_count ON coupons(used_count);

-- ============================================
-- CouponUsages表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coupon_usages_used_at ON coupon_usages(used_at);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_discount_amount ON coupon_usages(discount_amount);

-- ============================================
-- InventoryAlerts表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_alert_level ON inventory_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_created_at ON inventory_alerts(created_at);

-- ============================================
-- RouteOptimizations表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_route_optimizations_saved_distance ON route_optimizations(saved_distance);
CREATE INDEX IF NOT EXISTS idx_route_optimizations_saved_time ON route_optimizations(saved_time);
CREATE INDEX IF NOT EXISTS idx_route_optimizations_created_at ON route_optimizations(created_at);

-- ============================================
-- Notifications表补充索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- ============================================
-- 索引创建完成
-- ============================================
-- 本脚本共创建了约60+个索引，覆盖了所有常用查询字段
-- 包括：外键字段、状态字段、时间字段、金额字段、类型字段等

