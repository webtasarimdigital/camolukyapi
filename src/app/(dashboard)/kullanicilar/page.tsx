import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NewUserModal from './NewUserModal';

export default async function KullanicilarPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/login');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', userData.user.id)
    .single();

  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== 'admin') redirect('/dashboard');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', profile.company_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Kullanıcılar</h1>
          <p className="text-sm text-text-muted">Sistem kullanıcılarını yönetin.</p>
        </div>
        <NewUserModal companyId={profile.company_id} />
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Ad Soyad</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">E-posta / Kullanıcı Adı</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Rol</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {profiles?.map((p: any) => (
              <tr key={p.id} className="hover:bg-surface transition">
                <td className="px-4 py-3 font-medium">{p.full_name}</td>
                <td className="px-4 py-3 text-text-muted">{p.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${p.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                    {p.role === 'admin' ? 'Yönetici' : 'Personel'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
