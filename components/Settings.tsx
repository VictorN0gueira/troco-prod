import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Save,
  Camera,
  X,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  HelpCircle,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import { PushManager } from './PushManager';
import { useNotification } from '../contexts/NotificationContext';

interface SettingsProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
  // --- States ---
  const [isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();

  // Local form state initialized from props
  const [formData, setFormData] = useState<UserProfile>(user);

  // State to hold the actual file object for upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Initialize notifications from user prop
  const [notifications, setNotifications] = useState({
    email: user.notificacoes_email ?? true,
    push: user.notificacoes_push ?? false,
    marketing: user.notificacoes_marketing ?? false,
    whatsapp: user.notificacoes_whatsapp ?? false
  });

  // Keep formData in sync if user changes externally, but allow local edits
  useEffect(() => {
    // Only update these specific fields from prop to avoid overwriting typed input
    // This is a simple sync strategy
  }, [user]);

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  // 1. Inputs Gerais
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 2. Seleção de Avatar (Preview Local)
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo MIME
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      showNotification({
        title: 'Formato inválido',
        message: 'Por favor, selecione uma imagem JPG, PNG, WebP ou GIF.',
        type: 'error'
      });
      return;
    }

    // Validação de tamanho (máx 5MB)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      showNotification({
        title: 'Arquivo muito grande',
        message: 'A imagem deve ter no máximo 5MB.',
        type: 'error'
      });
      return;
    }

    // Criar preview local
    const imageUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, avatarUrl: imageUrl }));
    setAvatarFile(file);
  };

  // 3. Salvar Perfil (Upload + Database Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalAvatarUrl = formData.avatarUrl;

      // If there is a new file selected, upload it to Supabase Storage
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) {
          // Wrap storage error
          throw new Error(`Erro no upload da imagem: ${uploadError.message}`);
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        finalAvatarUrl = publicUrl;
      }

      // Prepare updated profile
      const updatedProfile: UserProfile = {
        ...formData,
        avatarUrl: finalAvatarUrl,
        // Include current notification state in full save
        notificacoes_email: notifications.email,
        notificacoes_push: notifications.push,
        notificacoes_marketing: notifications.marketing,
        notificacoes_whatsapp: notifications.whatsapp
      };

      // Call parent handler to update Database
      await onUpdateUser(updatedProfile);

      showNotification({
        title: 'Sucesso',
        message: 'Perfil atualizado com sucesso!',
        type: 'success'
      });
      setAvatarFile(null); // Clear file state after success

    } catch (error: any) {
      console.error("Erro detalhado ao salvar perfil:", error);

      let displayMessage = "Ocorreu um erro desconhecido.";

      try {
        if (typeof error === 'string') {
          displayMessage = error;
        } else if (error instanceof Error) {
          displayMessage = error.message;
        } else if (error && typeof error === 'object') {
          // Tenta propriedades conhecidas
          // Verifica se message é string antes de atribuir
          const msg = error.message || error.error_description || (error.data && error.data.message);

          if (typeof msg === 'string') {
            displayMessage = msg;
          } else {
            // Fallback para stringify se não encontrar mensagem texto
            displayMessage = JSON.stringify(error);
          }
        }
      } catch (parseError) {
        displayMessage = "Não foi possível detalhar o erro.";
      }

      showNotification({
        title: 'Erro de Atualização',
        message: `Erro ao salvar: ${displayMessage}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Toggles de Notificação (Autosave)
  const toggleNotification = async (key: keyof typeof notifications) => {
    const newVal = !notifications[key];

    // 1. Update UI immediately (Optimistic)
    setNotifications(prev => ({ ...prev, [key]: newVal }));

    // 2. Trigger background save without blocking UI
    const updatedProfile: UserProfile = {
      ...user,
      ...formData,
      notificacoes_email: key === 'email' ? newVal : notifications.email,
      notificacoes_push: key === 'push' ? newVal : notifications.push,
      notificacoes_marketing: key === 'marketing' ? newVal : notifications.marketing,
      notificacoes_whatsapp: key === 'whatsapp' ? newVal : (notifications as any).whatsapp
    };

    try {
      await onUpdateUser(updatedProfile);
    } catch (error) {
      console.error("Erro ao salvar preferência", error);
      setNotifications(prev => ({ ...prev, [key]: !newVal }));
    }
  };

  // 5. Lógica de Alteração de Senha
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    // Limpa o erro ao digitar
    if (passwordError) setPasswordError(null);
  };

  const submitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!passwordForm.current) {
      setPasswordError("Por favor, informe sua senha atual.");
      return;
    }

    if (passwordForm.new.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError("As novas senhas não coincidem.");
      return;
    }

    if (passwordForm.current === passwordForm.new) {
      setPasswordError("A nova senha deve ser diferente da atual.");
      return;
    }

    setPasswordLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.current
      });

      if (signInError) {
        throw new Error("A senha atual está incorreta.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.new
      });

      if (updateError) throw updateError;

      setIsPasswordModalOpen(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
      showNotification({
        title: 'Sucesso',
        message: 'Senha alterada com sucesso!',
        type: 'success'
      });

    } catch (error: any) {
      setPasswordError(error.message || "Erro ao alterar senha.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetPasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
    setPasswordError(null);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-850 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configurações da Conta</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie seus dados pessoais e preferências.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-850 p-6 md:p-8 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Dados Pessoais
            </h3>

            {/* Avatar Section */}
            <div className="flex items-center gap-6 mb-8">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 p-1 border-2 border-dashed border-slate-300 dark:border-slate-600 group-hover:border-primary-500 transition-colors overflow-hidden">
                  <img
                    src={formData.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=random'}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="text-sm font-semibold text-primary-500 hover:text-primary-600"
                >
                  Alterar foto
                </button>
                <p className="text-xs text-slate-400 mt-1">Clique na imagem para enviar (JPG ou PNG).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    disabled
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-6 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 active:transform active:scale-95 transition-all shadow-lg shadow-primary-500/30 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Salvando...
                  </span>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Section */}
          <div className="bg-white dark:bg-slate-850 p-6 md:p-8 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" />
              Segurança
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">Senha</p>
                <p className="text-sm text-slate-500">Mantenha sua conta segura</p>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Alterar Senha
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Notifications only */}
        <div className="space-y-6">

          {/* Notifications */}
          <div className="bg-white dark:bg-slate-850 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-500" />
              Notificações
            </h3>

            {/* Push Manager Component / Smart Notifications Paywall */}
            {user.status_assinatura === 'active' ? (
              <PushManager userId={user.id} />
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-20 transform group-hover:scale-110 transition-transform">
                  <Bell className="w-16 h-16 text-emerald-500" />
                </div>
                <div className="relative z-10">
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-1 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Notificações Inteligentes
                  </h4>
                  <p className="text-sm text-emerald-700/80 dark:text-emerald-500/80 mb-3">
                    Assine o Super Trocô para receber alertas de faturas e pagamentos no WhatsApp e Email.
                  </p>
                  <a
                    href={user?.email ? `https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d?email=${encodeURIComponent(user.email)}` : "https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Fazer Upgrade
                  </a>
                </div>
              </div>
            )}

            <div className={`space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 ${user.status_assinatura !== 'active' ? 'opacity-50 pointer-events-none' : ''}`}>
              {[
                { label: 'Alertas por Email', key: 'email' },
                { label: 'Alertas por WhatsApp', key: 'whatsapp' },
                { label: 'Novidades e Ofertas', key: 'marketing' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                  <button
                    onClick={() => toggleNotification(item.key as keyof typeof notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${notifications[item.key as keyof typeof notifications] ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Support Card */}
          <div className="bg-white dark:bg-slate-850 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
                <HelpCircle className="w-5 h-5 text-primary-500" />
                Suporte
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Precisa de ajuda? Fale com nosso time de atendimento.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <a
                href="https://wa.me/5581987348633"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">WhatsApp</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">(81) 98734-8633</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
              </a>

              <a
                href="mailto:contato@vnone.com.br"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-lg group-hover:scale-110 transition-transform">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Email</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">contato@vnone.com.br</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-primary-500" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={resetPasswordModal}
            />

            <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:w-full sm:max-w-md animate-scale-in">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Alterar Senha</h3>
                <button
                  onClick={resetPasswordModal}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={submitPasswordChange} className="p-6 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                  Por segurança, confirme sua senha atual para continuar.
                </div>

                {/* Error Banner */}
                {passwordError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-300">{passwordError}</p>
                  </div>
                )}

                {/* Senha Atual */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Senha Atual</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="current"
                      value={passwordForm.current}
                      onChange={handlePasswordChange}
                      required
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Sua senha atual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="my-4 border-t border-slate-100 dark:border-slate-700"></div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="new"
                      value={passwordForm.new}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Nova senha segura"
                    />
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirm"
                      value={passwordForm.confirm}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Repita a nova senha"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 active:scale-95 transition-all shadow-lg shadow-primary-500/30 disabled:opacity-70"
                  >
                    {passwordLoading ? (
                      <span className="flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Validando...
                      </span>
                    ) : (
                      'Atualizar Senha'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;