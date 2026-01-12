-- 仓库出入库记录触发器
-- 功能：当订单状态变为SHIPPING时创建出库记录，取消时创建入库记录

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fn_warehouse_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果状态从非SHIPPING变为SHIPPING，创建出库记录
  IF NEW.status = 'SHIPPING' AND (OLD.status IS NULL OR OLD.status != 'SHIPPING') THEN
    IF NEW.warehouse_id IS NOT NULL THEN
      INSERT INTO warehouse_transactions (
        id,
        warehouse_id,
        order_id,
        transaction_type,
        quantity,
        operator,
        remark,
        transaction_date,
        created_at
      )
      VALUES (
        gen_random_uuid()::text,
        NEW.warehouse_id,
        NEW.id,
        'OUT',
        1, -- 每个订单出库1件
        COALESCE(current_setting('app.user_id', true), 'system'),
        CONCAT('订单', NEW.order_no, '出库'),
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  -- 如果状态从SHIPPING变为CANCELLED，创建入库记录（退回）
  IF NEW.status = 'CANCELLED' AND OLD.status = 'SHIPPING' THEN
    IF OLD.warehouse_id IS NOT NULL THEN
      INSERT INTO warehouse_transactions (
        id,
        warehouse_id,
        order_id,
        transaction_type,
        quantity,
        operator,
        remark,
        transaction_date,
        created_at
      )
      VALUES (
        gen_random_uuid()::text,
        OLD.warehouse_id,
        NEW.id,
        'IN',
        1, -- 退回1件
        COALESCE(current_setting('app.user_id', true), 'system'),
        CONCAT('订单', NEW.order_no, '取消退回'),
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_warehouse_transaction ON orders;
CREATE TRIGGER trg_warehouse_transaction
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_warehouse_transaction();

