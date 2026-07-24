export const LOCALES = ["en", "ja", "my", "vi"] as const;
export type FidsLocale = (typeof LOCALES)[number];

type Dict = {
  title: string;
  flight: string;
  gate: string;
  scheduled: string;
  status: string;
  statusLabels: Record<string, string>;
  alertPrefix: string;
  noFlights: string;
  offline: string;
  updated: string;
  lastUpdated: string;
};

export const DICTIONARY: Record<FidsLocale, Dict> = {
  en: {
    title: "Flight Information",
    flight: "Flight",
    gate: "Gate",
    scheduled: "Scheduled",
    status: "Status",
    statusLabels: {
      SCHEDULED: "Scheduled",
      BOARDING: "Boarding",
      DELAYED: "Delayed",
      DEPARTED: "Departed",
      CANCELLED: "Cancelled",
    },
    alertPrefix: "Attention",
    noFlights: "No flight information available.",
    offline: "Offline",
    updated: "Updated",
    lastUpdated: "Last updated",
  },
  ja: {
    title: "フライト情報",
    flight: "便名",
    gate: "ゲート",
    scheduled: "予定時刻",
    status: "状況",
    statusLabels: {
      SCHEDULED: "定刻",
      BOARDING: "搭乗中",
      DELAYED: "遅延",
      DEPARTED: "出発済み",
      CANCELLED: "欠航",
    },
    alertPrefix: "お知らせ",
    noFlights: "フライト情報はありません。",
    offline: "オフライン",
    updated: "更新済み",
    lastUpdated: "最終更新",
  },
  my: {
    title: "လေယာဉ်အချက်အလက်",
    flight: "လေယာဉ်",
    gate: "ဂိတ်",
    scheduled: "သတ်မှတ်ချိန်",
    status: "အခြေအနေ",
    statusLabels: {
      SCHEDULED: "အချိန်အတိုင်း",
      BOARDING: "လေယာဉ်တက်နေသည်",
      DELAYED: "နောက်ကျ",
      DEPARTED: "ထွက်ခွာပြီး",
      CANCELLED: "ပယ်ဖျက်",
    },
    alertPrefix: "သတိပြုရန်",
    noFlights: "လေယာဉ်အချက်အလက် မရှိသေးပါ။",
    offline: "အော့ဖ်လိုင်း",
    updated: "အပ်ဒိတ်ဖြစ်ပြီး",
    lastUpdated: "နောက်ဆုံးအပ်ဒိတ်",
  },
  vi: {
    title: "Thông Tin Chuyến Bay",
    flight: "Chuyến bay",
    gate: "Cổng",
    scheduled: "Giờ dự kiến",
    status: "Trạng thái",
    statusLabels: {
      SCHEDULED: "Đúng giờ",
      BOARDING: "Đang lên máy bay",
      DELAYED: "Trễ chuyến",
      DEPARTED: "Đã khởi hành",
      CANCELLED: "Đã hủy",
    },
    alertPrefix: "Chú ý",
    noFlights: "Chưa có thông tin chuyến bay.",
    offline: "Ngoại tuyến",
    updated: "Đã cập nhật",
    lastUpdated: "Cập nhật lần cuối",
  },
};
