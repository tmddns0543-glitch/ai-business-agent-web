import SalesPlatformForm from "@/components/sales/sales-platform-form";
import { YOGIYO_CONFIG } from "@/data/sales-platforms";

export default function YogiyoSalesPage() {
  return <SalesPlatformForm config={YOGIYO_CONFIG} />;
}