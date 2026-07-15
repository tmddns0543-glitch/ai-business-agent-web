import SalesPlatformForm from "@/components/sales/sales-platform-form";
import { DDANGYO_CONFIG } from "@/data/sales-platforms";

export default function DdangyoSalesPage() {
  return <SalesPlatformForm config={DDANGYO_CONFIG} />;
}