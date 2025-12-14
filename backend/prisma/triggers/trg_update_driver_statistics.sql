-- 配送员工作量统计触发器
-- 功能：当订单状态变为DELIVERED时，自动更新配送员的 total_orders 和 on_time_rate

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fn_update_driver_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id TEXT;
  v_total_orders INTEGER;
  v_on_time_count INTEGER;
  v_on_time_rate DOUBLE PRECISION;
BEGIN
  -- 只有当状态变为DELIVERED且有配送员时才更新
  IF NEW.status = 'DELIVERED' AND NEW.delivery_driver_id IS NOT NULL THEN
    v_driver_id := NEW.delivery_driver_id;

    -- 更新配送员的完成订单数
    UPDATE delivery_drivers
    SET total_orders = total_orders + 1
    WHERE id = v_driver_id;

    -- 计算准时率：统计该配送员所有已送达订单中，实际时间 <= 预计时间的比例
    SELECT COUNT(*) INTO v_total_orders
    FROM orders
    WHERE delivery_driver_id = v_driver_id AND status = 'DELIVERED';

    SELECT COUNT(*) INTO v_on_time_count
    FROM orders
    WHERE delivery_driver_id = v_driver_id 
      AND status = 'DELIVERED'
      AND actual_time IS NOT NULL
      AND estimated_time IS NOT NULL
      AND actual_time <= estimated_time;

    -- 计算准时率
    IF v_total_orders > 0 THEN
      v_on_time_rate := v_on_time_count::DOUBLE PRECISION / v_total_orders::DOUBLE PRECISION;
    ELSE
      v_on_time_rate := 0;
    END IF;

    -- 更新配送员的准时率
    UPDATE delivery_drivers
    SET on_time_rate = v_on_time_rate
    WHERE id = v_driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_update_driver_statistics ON orders;
CREATE TRIGGER trg_update_driver_statistics
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED')
  EXECUTE FUNCTION fn_update_driver_statistics();

