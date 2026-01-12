-- 库存不足自动预警触发器
-- 当仓库库存低于阈值时，自动创建预警记录

CREATE OR REPLACE FUNCTION trg_inventory_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold INTEGER;
    v_alert_level TEXT;
BEGIN
    -- 设置预警阈值（可以根据实际情况调整）
    -- 低库存：当前库存 <= 容量的20%
    -- 严重缺货：当前库存 <= 容量的10%
    
    IF NEW.current_stock <= (NEW.capacity * 0.1) THEN
        v_threshold := NEW.capacity * 0.1;
        v_alert_level := 'CRITICAL';
    ELSIF NEW.current_stock <= (NEW.capacity * 0.2) THEN
        v_threshold := NEW.capacity * 0.2;
        v_alert_level := 'LOW';
    ELSE
        RETURN NEW;
    END IF;
    
    -- 检查是否已存在未解决的预警记录
    IF NOT EXISTS (
        SELECT 1 FROM inventory_alerts
        WHERE warehouse_id = NEW.id
        AND alert_level = v_alert_level
        AND is_resolved = false
    ) THEN
        -- 为仓库中的每个商品创建预警记录
        INSERT INTO inventory_alerts (
            id, warehouse_id, product_id, current_stock, alert_threshold, 
            alert_level, is_resolved, created_at, updated_at
        )
        SELECT 
            gen_random_uuid()::text,
            NEW.id,
            p.id,
            NEW.current_stock,
            v_threshold,
            v_alert_level,
            false,
            NOW(),
            NOW()
        FROM products p
        WHERE p.merchant_id IN (
            SELECT DISTINCT merchant_id FROM orders WHERE warehouse_id = NEW.id
        )
        LIMIT 10; -- 限制每个仓库最多创建10条预警记录
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_inventory_alert ON warehouses;
CREATE TRIGGER trg_inventory_alert
    AFTER UPDATE OF current_stock ON warehouses
    FOR EACH ROW
    WHEN (NEW.current_stock < OLD.current_stock)
    EXECUTE FUNCTION trg_inventory_alert();

