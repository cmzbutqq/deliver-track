-- 费用结算明细视图
-- 包含: 结算单信息 + 订单费用明细

CREATE OR REPLACE VIEW v_fee_settlement_detail AS
SELECT
  fs.id AS settlement_id,
  fs.settlement_no,
  fs.merchant_id,
  m.name AS merchant_name,
  fs.start_date,
  fs.end_date,
  fs.total_amount,
  fs.settled_amount,
  fs.status AS settlement_status,
  fs.settled_at,
  fs.created_at AS settlement_created_at,
  fsd.id AS detail_id,
  fsd.order_id,
  o."orderNo" AS order_no,
  fsd.fee_type,
  fsd.amount AS detail_amount,
  fsd.created_at AS detail_created_at
FROM fee_settlements fs
JOIN merchants m ON fs.merchant_id = m.id
LEFT JOIN fee_settlement_details fsd ON fs.id = fsd.settlement_id
LEFT JOIN orders o ON fsd.order_id = o.id
ORDER BY fs.created_at DESC, fsd.created_at DESC;

