"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import {
  searchProductsForDealer,
  submitDealerOrder,
  type DealerOrderItemInput,
} from "../actions";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Trash2,
  Send,
  Loader2,
  Package,
  Plus,
  Minus,
  AlertCircle,
  Building2,
  MapPin,
  Phone,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface DealerProfile {
  fullName: string;
  phone: string;
}

export function DealerOrderForm({ profile }: { profile: DealerProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Selected items state
  const [orderItems, setOrderItems] = useState<DealerOrderItemInput[]>([]);

  // Form fields
  const [contactPhone, setContactPhone] = useState(profile.phone || "");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Handle Search
  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchProductsForDealer(q);
      setSearchResults(results);
    } catch {
      toast.error("Ürün arama sırasında hata oluştu.");
    } finally {
      setIsSearching(false);
    }
  }

  // Add product to order
  function addProductToOrder(product: any) {
    const existingIndex = orderItems.findIndex(
      (item) => item.productId === product.id
    );

    const unitPrice =
      product.price_quality_1 ||
      product.default_sale_price ||
      product.price_commercial ||
      0;

    if (existingIndex > -1) {
      // Increment quantity
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      setOrderItems(updated);
      toast.info(`"${product.product_name}" miktarı artırıldı.`);
    } else {
      const newItem: DealerOrderItemInput = {
        productId: product.id,
        productCode: product.product_code || "-",
        productName: product.product_name,
        unit: product.unit || "ADET",
        quantity: 1,
        unitPrice: Number(unitPrice),
      };
      setOrderItems((prev) => [...prev, newItem]);
      toast.success(`"${product.product_name}" siparişe eklendi.`);
    }
  }

  // Update quantity
  function updateItemQty(index: number, newQty: number) {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    const updated = [...orderItems];
    updated[index].quantity = newQty;
    setOrderItems(updated);
  }

  // Remove item
  function removeItem(index: number) {
    const item = orderItems[index];
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
    toast.info(`"${item.productName}" siparişten çıkarıldı.`);
  }

  // Totals
  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const vatTotal = subtotal * 0.2;
  const grandTotal = subtotal + vatTotal;

  // Submit
  function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (orderItems.length === 0) {
      toast.error("Lütfen siparişinize en az bir ürün ekleyin.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitDealerOrder({
          items: orderItems,
          contactPhone,
          shippingAddress,
          notes,
        });

        if (res.success) {
          toast.success(
            `Siparişiniz (${res.orderCode}) başarıyla oluşturuldu ve onay için merkeze iletildi!`
          );
          router.push("/bayi-siparis");
        }
      } catch (err: any) {
        toast.error("Sipariş gönderilemedi: " + (err?.message || "Bilinmeyen hata"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmitOrder} className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Üst Karşılama Kartı */}
      <div className="bg-gradient-to-r from-brand-navy to-brand-navy-2 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-gold text-brand-navy uppercase tracking-wider">
              Tali Bayi Portalı
            </span>
            <span className="text-xs text-slate-300">
              {profile.fullName || "Tali Bayi"}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Yeni Bayi Siparişi Oluştur
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            İhtiyacınız olan ürünleri seçin, miktarlarını belirleyin ve siparişinizi
            merkeze iletin. Yönetici onayının ardından siparişiniz resmi satışa
            dönüştürülüp sevkiyat süreci başlatılacaktır.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 p-3.5 rounded-xl border border-white/10 text-xs">
          <Building2 size={24} className="text-brand-gold flex-shrink-0" />
          <div>
            <p className="text-slate-300 font-medium">Bayi Ünvanı</p>
            <p className="font-bold text-white text-sm">
              {profile.fullName || "Yetkili Bayi"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SOL VE ORTA: ÜRÜN ARAMA VE SEÇİLEN KALEMLER */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ürün Arama Kartı */}
          <div className="bg-white rounded-2xl p-5 border border-border shadow-xs">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-3">
              <Search size={16} className="text-brand-gold" />
              Ürün Ara ve Sepete Ekle
            </h2>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Ürün adı, ürün kodu, seri veya ebat ile arayın (örn: 60x120, Kütahya, Alessa)..."
                className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
              />
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              {isSearching && (
                <Loader2
                  size={18}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-gold animate-spin"
                />
              )}
            </div>

            {/* Arama Sonuçları */}
            {searchResults.length > 0 && (
              <div className="mt-3 border border-border rounded-xl max-h-80 overflow-y-auto divide-y divide-border bg-white shadow-lg animate-in fade-in duration-150">
                {searchResults.map((product) => {
                  const p1 =
                    product.price_quality_1 ||
                    product.default_sale_price ||
                    product.price_commercial ||
                    0;
                  const stock = Number(product.stock_qty || 0);

                  return (
                    <div
                      key={product.id}
                      className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {product.product_name}
                          </span>
                          {product.product_code && (
                            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                              {product.product_code}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          {product.series_name && (
                            <span>Seri: {product.series_name}</span>
                          )}
                          {product.size && <span>Ebat: {product.size}</span>}
                          <span>Birim: {product.unit || "ADET"}</span>
                          <span
                            className={`font-semibold ${
                              stock > 0 ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            Stok: {stock} {product.unit || "ADET"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">
                            Birim Fiyat
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {formatCurrency(p1)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addProductToOrder(product)}
                          className="bg-brand-navy hover:bg-brand-navy-2 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                        >
                          <Plus size={14} /> Ekle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sipariş Kalemleri Tablosu */}
          <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <ShoppingCart size={16} className="text-brand-gold" />
                Sipariş Edilecek Ürünler ({orderItems.length} Kalem)
              </h2>
              {orderItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOrderItems([])}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                >
                  Listeyi Temizle
                </button>
              )}
            </div>

            {orderItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Package size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">
                  Henüz ürün eklemediniz
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Yukarıdaki arama çubuğunu kullanarak sipariş etmek istediğiniz
                  ürünleri arayıp listeye ekleyebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px] border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Ürün Kodu & Adı</th>
                      <th className="py-2.5 px-3 text-center">Birim</th>
                      <th className="py-2.5 px-3 text-center">Miktar</th>
                      <th className="py-2.5 px-3 text-right">Liste Fiyatı</th>
                      <th className="py-2.5 px-3 text-right">Toplam Tutar</th>
                      <th className="py-2.5 px-3 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orderItems.map((item, idx) => {
                      const lineTotal = item.quantity * item.unitPrice;
                      return (
                        <tr key={item.productId} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-semibold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block text-xs">
                              {item.productName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {item.productCode}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-slate-600">
                            {item.unit}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center border border-border rounded-lg bg-white overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() =>
                                  updateItemQty(idx, item.quantity - 1)
                                }
                                className="px-2 py-1 hover:bg-slate-100 text-slate-600 transition"
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItemQty(
                                    idx,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-14 text-center font-bold text-xs py-1 border-x border-border focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateItemQty(idx, item.quantity + 1)
                                }
                                className="px-2 py-1 hover:bg-slate-100 text-slate-600 transition"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Kalemi Sil"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: TESLİMAT BİLGİLERİ VE SİPARİŞ ÖZETİ */}
        <div className="space-y-6">
          {/* Teslimat Bilgileri Kartı */}
          <div className="bg-white rounded-2xl p-5 border border-border shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <MapPin size={16} className="text-brand-gold" />
              Teslimat & İletişim Bilgileri
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone size={13} className="text-slate-400" />
                İletişim Telefonu
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Örn: 0532 XXX XX XX"
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" />
                Teslimat / Şantiye Adresi
              </label>
              <textarea
                rows={3}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Malzemenin teslim edileceği şantiye veya depo açık adresini yazınız..."
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" />
                Sipariş Notu (Opsiyonel)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Varsa özel istekleriniz, termin veya sevkiyat notu..."
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>
          </div>

          {/* Sipariş Finans Özeti Kartı */}
          <div className="bg-white rounded-2xl p-5 border border-border shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Sipariş Özeti
            </h2>

            <div className="space-y-2 text-xs border-b border-border pb-3">
              <div className="flex justify-between text-slate-600">
                <span>Ürün Kalem Sayısı:</span>
                <span className="font-semibold text-slate-900">
                  {orderItems.length} Kalem
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Toplam Miktar:</span>
                <span className="font-semibold text-slate-900">
                  {orderItems.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  Birim
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ara Toplam (KDV Hariç):</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tahmini KDV (%20):</span>
                <span className="font-semibold text-slate-700">
                  {formatCurrency(vatTotal)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm pt-1">
              <span className="font-bold text-slate-900">
                Tahmini Genel Toplam:
              </span>
              <span className="font-black text-xl text-brand-navy">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 text-xs text-amber-800">
              <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p>
                Siparişiniz merkeze (admin onayına) iletilecektir. Yetkili
                incelemesinde bayi iskontosu ve nihai fiyatlar uygulanıp onaylanacaktır.
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending || orderItems.length === 0}
              className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold py-3.5 px-4 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sipariş İletiliyor...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Siparişi Onaya Gönder
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
