'use client';

import { useState } from 'react';
import { addPartnerMovement } from './actions';

export default function AddMovementModal({ partnerId, onClose }: { partnerId: string; onClose: () => void }) {
  const [direction, setDirection] = useState('partner_to_company');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-navy">Yeni Cari Hareket Ekle</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">&times;</button>
        </div>
        
        <form action={async (formData) => {
          await addPartnerMovement(formData);
          onClose();
        }} className="p-6 space-y-4">
          <input type="hidden" name="partner_id" value={partnerId} />
          <input type="hidden" name="direction" value={direction} />

          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => setDirection('partner_to_company')}
              className={`p-4 rounded-lg border-2 text-sm font-semibold transition ${
                direction === 'partner_to_company' 
                  ? 'border-green-600 bg-green-50 text-green-700' 
                  : 'border-border text-text-muted hover:border-green-300'
              }`}
            >
              Ortak Firmaya Para Verdi
            </button>
            <button 
              type="button"
              onClick={() => setDirection('company_to_partner')}
              className={`p-4 rounded-lg border-2 text-sm font-semibold transition ${
                direction === 'company_to_partner' 
                  ? 'border-brand-red bg-red-50 text-brand-red' 
                  : 'border-border text-text-muted hover:border-red-300'
              }`}
            >
              Firma Ortağa Para Verdi
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Tutar (₺) *</label>
            <input type="number" step="0.01" name="amount" required className="w-full border border-border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Tarih *</label>
            <input type="date" name="transaction_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Sebep / Açıklama *</label>
            <input type="text" name="reason" required className="w-full border border-border rounded px-3 py-2 text-sm" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text mb-1">Belge No (İsteğe Bağlı)</label>
            <input type="text" name="doc_no" className="w-full border border-border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Notlar</label>
            <textarea name="notes" rows={2} className="w-full border border-border rounded px-3 py-2 text-sm"></textarea>
          </div>

          <div className="pt-4 flex gap-4 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded text-sm font-medium text-text bg-surface border border-border hover:bg-gray-100">
              İptal
            </button>
            <button type="submit" className="px-4 py-2 rounded text-sm font-semibold bg-brand-gold text-brand-navy hover:bg-brand-gold-light">
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
