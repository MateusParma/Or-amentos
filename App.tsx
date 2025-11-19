
import React, { useState, useCallback, useEffect } from 'react';
import type { QuoteData, Currency, UserSettings } from './types';
import { QuoteInputForm } from './components/QuoteInputForm';
import { QuoteResult } from './components/QuoteResult';
import { LoadingSpinner } from './components/LoadingSpinner';
import { QuoteHistory } from './components/QuoteHistory';
import { generateQuote } from './services/geminiService';
import { LogoIcon, HistoryIcon, PencilIcon, UploadIcon, CogIcon } from './components/icons';

type Page = 'form' | 'loading' | 'result' | 'history' | 'view' | 'settings';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
};

const UserSettingsForm: React.FC<{ settings: UserSettings; onSave: (newSettings: UserSettings) => void; }> = ({ settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        try {
          const base64Logo = await fileToBase64(file);
          setLocalSettings(prev => ({ ...prev, companyLogo: base64Logo }));
        } catch (error) {
          console.error("Error converting file to base64", error);
          alert("Não foi possível carregar a imagem.");
        }
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      onSave(localSettings);
      setTimeout(() => {
          setIsSaving(false);
          alert("Configurações salvas com sucesso!");
      }, 500);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800">Configurações da Empresa</h2>
        <div className="p-4 border border-gray-200 rounded-lg space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
            <input type="text" id="companyName" name="companyName" value={localSettings.companyName} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition" placeholder="Minha Empresa de Construção" />
          </div>
          <div>
            <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input type="text" id="companyAddress" name="companyAddress" value={localSettings.companyAddress} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition" placeholder="Rua Principal, 123, Cidade" />
          </div>
          <div>
            <label htmlFor="companyTaxId" className="block text-sm font-medium text-gray-700 mb-1">NIF / Contribuinte</label>
            <input type="text" id="companyTaxId" name="companyTaxId" value={localSettings.companyTaxId} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition" placeholder="999999999" />
          </div>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Logo da Empresa</h3>
            <div className="flex items-center gap-6">
                {localSettings.companyLogo ? (<img src={localSettings.companyLogo} alt="Logo da Empresa" className="h-20 w-20 object-contain rounded-md bg-gray-100 p-1" />) : (<div className="h-20 w-20 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">Sem Logo</div>)}
                <div>
                    <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        <UploadIcon className="h-5 w-5 mr-2" />
                        {localSettings.companyLogo ? 'Alterar Logo' : 'Carregar Logo'}
                    </label>
                    <input id="logo-upload" name="logo-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={handleLogoChange} />
                    <p className="text-xs text-gray-500 mt-2">Recomendado: PNG ou JPG.</p>
                </div>
            </div>
        </div>
        <button type="submit" disabled={isSaving} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary hover:bg-secondary disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition">
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>
    );
};

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('form');
  const [currentQuote, setCurrentQuote] = useState<QuoteData | null>(null);
  const [currentImages, setCurrentImages] = useState<File[]>([]); // Keep images in state
  const [savedQuotes, setSavedQuotes] = useState<QuoteData[]>([]);
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [error, setError] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    companyName: '', companyAddress: '', companyTaxId: '', companyLogo: ''
  });

  useEffect(() => {
    try {
      const storedQuotes = localStorage.getItem('savedQuotes');
      if (storedQuotes) setSavedQuotes(JSON.parse(storedQuotes));
      const storedSettings = localStorage.getItem('userSettings');
      if (storedSettings) setUserSettings(JSON.parse(storedSettings));
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
    } catch (e) {
      console.error("Failed to save quotes to localStorage", e);
    }
  }, [savedQuotes]);

  useEffect(() => {
    try {
        localStorage.setItem('userSettings', JSON.stringify(userSettings));
    } catch (e) {
        console.error("Failed to save settings to localStorage", e);
    }
  }, [userSettings]);

  const handleGenerateQuote = useCallback(async (description: string, city: string, images: File[], selectedCurrency: Currency, clientName: string, clientAddress: string, clientContact: string) => {
    setPage('loading');
    setError(null);
    setCurrency(selectedCurrency);
    setCurrentImages(images); // Store images
    try {
      const result = await generateQuote(description, city, images, selectedCurrency, clientName);
      const newQuote: QuoteData = {
          ...result,
          id: `temp-${Date.now()}`,
          date: new Date().toISOString(),
          clientName, clientAddress, clientContact,
          executionTime: result.executionTime,
          paymentTerms: result.paymentTerms
      }
      setCurrentQuote(newQuote);
      setPage('result');
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
      setError(`Falha ao gerar o orçamento: ${errorMessage}`);
      setPage('form');
    }
  }, []);

  const handleReset = useCallback(() => {
    setPage('form');
    setCurrentQuote(null);
    setCurrentImages([]);
    setError(null);
  }, []);

  const calculateTotal = (quote: QuoteData) => {
    return quote.steps.reduce((acc, step) => {
        const price = Number(step.userPrice) || 0;
        const tax = Number(step.taxRate) || 0;
        const quantity = Number(step.quantity) || 1;
        return acc + (price * quantity) * (1 + tax / 100);
    }, 0);
  }

  const handleSaveQuote = useCallback((finalQuote: QuoteData) => {
    const newQuote: QuoteData = {
        ...finalQuote,
        id: new Date().toISOString() + Math.random(),
        date: new Date().toISOString(),
    };
    setSavedQuotes(prev => [...prev, newQuote]);
    setPage('history');
  }, []);

  const handleUpdateQuote = useCallback((updatedQuote: QuoteData) => {
    setSavedQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
    setPage('history');
  }, []);
  
  const handleSaveSettings = useCallback((newSettings: UserSettings) => {
    setUserSettings(newSettings);
  }, []);

  const handleDeleteQuote = useCallback((id: string) => {
    if (window.confirm('Tem certeza que deseja deletar este orçamento?')) {
        setSavedQuotes(prev => prev.filter(quote => quote.id !== id));
    }
  }, []);

  const handleViewQuote = useCallback((id: string) => {
    const quoteToView = savedQuotes.find(q => q.id === id);
    if (quoteToView) {
        setCurrentQuote(quoteToView);
        setCurrentImages([]); // Images not available from local storage history
        setPage('view');
    }
  }, [savedQuotes]);

  const renderContent = () => {
    switch (page) {
      case 'loading':
        return <LoadingSpinner />;
      case 'result':
      case 'view':
        return currentQuote ? (
          <QuoteResult
            key={currentQuote.id}
            quote={currentQuote} 
            userSettings={userSettings}
            images={currentImages} // Pass images
            onReset={handleReset} 
            onSaveOrUpdate={page === 'result' ? handleSaveQuote : handleUpdateQuote}
            isViewingSaved={page === 'view'}
          />
        ) : null;
      case 'history':
        return <QuoteHistory quotes={savedQuotes} onNewQuote={handleReset} onViewQuote={handleViewQuote} onDeleteQuote={handleDeleteQuote} />;
      case 'settings':
        return <UserSettingsForm settings={userSettings} onSave={handleSaveSettings} />;
      case 'form':
      default:
        return <QuoteInputForm onSubmit={handleGenerateQuote} isLoading={false} currency={currency} setCurrency={setCurrency} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <header className="w-full max-w-4xl mb-6 flex items-center justify-between">
        <div className="flex items-center">
            <LogoIcon className="h-10 w-10 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold text-primary ml-3">IAO</h1>
        </div>
        <nav className="flex items-center space-x-4">
            {page !== 'form' && page !== 'loading' && (
                 <button onClick={handleReset} className="flex items-center text-primary font-semibold hover:text-secondary transition" title="Criar Novo Orçamento">
                    <PencilIcon className="h-5 w-5 mr-1" />
                    <span className="hidden sm:inline">Novo Orçamento</span>
                </button>
            )}
            {page !== 'history' && (
                <button onClick={() => setPage('history')} className="flex items-center text-primary font-semibold hover:text-secondary transition" title="Ver Meus Orçamentos">
                    <HistoryIcon className="h-5 w-5 mr-1" />
                    <span className="hidden sm:inline">Meus Orçamentos</span>
                </button>
            )}
            <button onClick={() => setPage('settings')} className="flex items-center text-primary font-semibold hover:text-secondary transition" title="Configurações">
                <CogIcon className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Configurações</span>
            </button>
        </nav>
      </header>
      
      <main className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
            <p className="font-bold">Erro</p>
            <p>{error}</p>
          </div>
        )}
        {renderContent()}
      </main>

      <footer className="w-full max-w-4xl mt-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Orçamento Inteligente AI. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;
