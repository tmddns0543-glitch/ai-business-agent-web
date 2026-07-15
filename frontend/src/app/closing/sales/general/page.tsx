import SalesPlatformForm from "@/components/sales/sales-platform-form";
import { GENERAL_CONFIG } from "@/data/sales-platforms";

export default function GeneralSalesPage() {
  return <SalesPlatformForm config={GENERAL_CONFIG} />;
}
