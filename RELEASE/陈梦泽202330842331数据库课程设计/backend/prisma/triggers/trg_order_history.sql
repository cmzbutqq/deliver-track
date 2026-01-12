-- 订单历史记录触发器
-- 功能：当订单状态变更时，自动插入订单历史记录

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fn_order_history()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果状态发生变化，插入历史记录
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_history (
      id,
      order_id,
      old_status,
      new_status,
      changed_by,
      change_reason,
      changed_at
    )
    VALUES (
      gen_random_uuid()::text,
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(current_setting('app.user_id', true), 'system'),
      CASE
        WHEN NEW.status = 'SHIPPING' THEN '订单已发货'
        WHEN NEW.status = 'DELIVERED' THEN '订单已送达'
        WHEN NEW.status = 'CANCELLED' THEN '订单已取消'
        ELSE '状态变更'
      END,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_order_history ON orders;
CREATE TRIGGER trg_order_history
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_order_history();

