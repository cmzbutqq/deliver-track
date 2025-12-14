-- 库存更新触发器
-- 功能：当订单状态变为SHIPPING时，自动减少对应仓库的库存

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fn_update_warehouse_inventory()
RETURNS TRIGGER AS $$
DECLARE
  v_warehouse_id TEXT;
  v_current_stock INTEGER;
  v_capacity INTEGER;
BEGIN
  -- 只有当状态变为SHIPPING且有仓库时才更新库存
  IF NEW.status = 'SHIPPING' AND NEW.warehouse_id IS NOT NULL THEN
    v_warehouse_id := NEW.warehouse_id;

    -- 获取当前库存和容量
    SELECT current_stock, capacity INTO v_current_stock, v_capacity
    FROM warehouses
    WHERE id = v_warehouse_id;

    -- 检查库存是否充足
    IF v_current_stock > 0 THEN
      -- 减少库存（假设每个订单消耗1个库存单位）
      UPDATE warehouses
      SET current_stock = current_stock - 1
      WHERE id = v_warehouse_id;
    ELSE
      -- 库存不足，记录警告（可以通过日志或异常表记录）
      RAISE WARNING '仓库 % 库存不足，无法发货订单 %', v_warehouse_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_update_warehouse_inventory ON orders;
CREATE TRIGGER trg_update_warehouse_inventory
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'SHIPPING' AND OLD.status != 'SHIPPING')
  EXECUTE FUNCTION fn_update_warehouse_inventory();

