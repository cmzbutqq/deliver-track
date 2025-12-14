-- 订单状态变更触发器
-- 功能：当订单状态变更时，自动创建时间线记录，更新商家统计

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fn_order_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果状态从非SHIPPING变为SHIPPING，自动创建"已发货"时间线记录
  IF NEW.status = 'SHIPPING' AND (OLD.status IS NULL OR OLD.status != 'SHIPPING') THEN
    INSERT INTO logistics_timeline (id, order_id, status, description, location, timestamp)
    VALUES (
      gen_random_uuid()::text,
      NEW.id,
      '已发货',
      '订单已从仓库发出，开始配送',
      COALESCE((NEW.origin->>'address')::text, ''),
      NOW()
    );
  END IF;

  -- 如果状态从非DELIVERED变为DELIVERED，自动创建"已送达"时间线记录
  IF NEW.status = 'DELIVERED' AND (OLD.status IS NULL OR OLD.status != 'DELIVERED') THEN
    INSERT INTO logistics_timeline (id, order_id, status, description, location, timestamp)
    VALUES (
      gen_random_uuid()::text,
      NEW.id,
      '已签收',
      '订单已送达并签收',
      COALESCE((NEW.destination->>'address')::text, ''),
      COALESCE(NEW.actual_time, NOW())
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_order_status_changed ON orders;
CREATE TRIGGER trg_order_status_changed
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_order_status_changed();

