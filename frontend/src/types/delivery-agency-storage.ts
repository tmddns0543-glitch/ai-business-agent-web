import type { BusinessDate } from "@/types/business-day";
import type {
  DeliveryAgency,
  DeliveryAgencyTransaction,
} from "@/types/delivery-agency";

export interface DeliveryAgencyStorageData {
  version: 1;
  agencies: DeliveryAgency[];
}

export interface BusinessDayDeliveryTransactionStorageData {
  version: 1;
  days: Partial<Record<BusinessDate, DeliveryAgencyTransaction[]>>;
}
