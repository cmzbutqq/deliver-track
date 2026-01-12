-- 费用结算触发器
-- 功能：当订单完成时更新费用结算表的待结算金额
--       当结算单状态变为"已结算"时，更新商家账户余额

-- 创建触发器函数：订单完成时更新待结算金额
CREATE OR REPLACE FUNCTION fn_fee_settlement_order()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果订单状态变为DELIVERED，查找相关的待结算结算单并更新
  IF NEW.status = 'DELIVERED' AND (OLD.status IS NULL OR OLD.status != 'DELIVERED') THEN
    IF NEW.total_fee IS NOT NULL AND NEW.total_fee > 0 THEN
      -- 查找该商家在订单创建日期所在月份的待结算结算单
      UPDATE fee_settlements
      SET total_amount = total_amount + NEW.total_fee
      WHERE merchant_id = NEW.merchant_id
        AND status = 'PENDING'
        AND DATE_TRUNC('month', start_date) = DATE_TRUNC('month', NEW.created_at)
        AND DATE_TRUNC('month', end_date) = DATE_TRUNC('month', NEW.created_at);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器函数：结算单状态变更时更新商家账户余额
CREATE OR REPLACE FUNCTION fn_fee_settlement_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果结算单状态从非SETTLED变为SETTLED，更新商家账户余额
  IF NEW.status = 'SETTLED' AND (OLD.status IS NULL OR OLD.status != 'SETTLED') THEN
    -- 更新商家账户余额（增加已结算金额）
    UPDATE merchants
    SET account_balance = account_balance + NEW.settled_amount
    WHERE id = NEW.merchant_id;

    -- 更新结算时间
    IF NEW.settled_at IS NULL THEN
      NEW.settled_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建订单触发器
DROP TRIGGER IF EXISTS trg_fee_settlement_order ON orders;
CREATE TRIGGER trg_fee_settlement_order
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'DELIVERED')
  EXECUTE FUNCTION fn_fee_settlement_order();

-- 创建结算单触发器
DROP TRIGGER IF EXISTS trg_fee_settlement_status ON fee_settlements;
CREATE TRIGGER trg_fee_settlement_status
  BEFORE UPDATE OF status ON fee_settlements
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'SETTLED')
  EXECUTE FUNCTION fn_fee_settlement_status();

