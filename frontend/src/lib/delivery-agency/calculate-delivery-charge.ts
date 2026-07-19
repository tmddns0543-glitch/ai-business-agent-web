import type { DeliveryAgencyChargeFeeMode } from "@/types/delivery-agency";

export interface DeliveryChargeCalculation {
  paymentAmount: number;
  chargeFee: number;
  actualCashCharge: number;
  externalPaymentTotal: number;
  valid: boolean;
}

function normalizeAmount(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function calculateDeliveryCharge(
  paymentAmount: number,
  chargeFee: number,
  mode: DeliveryAgencyChargeFeeMode,
): DeliveryChargeCalculation {
  const payment = normalizeAmount(paymentAmount);
  const fee = normalizeAmount(chargeFee);
  const valid = mode !== "deduct-from-payment" || fee <= payment;

  return {
    paymentAmount: payment,
    chargeFee: fee,
    actualCashCharge:
      mode === "deduct-from-payment" && valid ? payment - fee : payment,
    externalPaymentTotal:
      mode === "additional-payment" ? payment + fee : payment,
    valid,
  };
}
