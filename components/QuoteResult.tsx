
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { QuoteData, QuoteStep, Currency, UserSettings, TechnicalReportData } from '../types';
import { CheckCircleIcon, PencilIcon, DownloadIcon } from './AppIcons';
import { generateTechnicalReport } from '../services/geminiService';
import { TechnicalReport } from './TechnicalReport';

// Make jspdf and html2canvas available in the scope
declare const jspdf: any;
declare const html2canvas: any;

interface QuoteResultProps {
  quote: QuoteData;
  userSettings: UserSettings;
  images: File[]; // Received from App
  onReset: () => void;
  onSaveOrUpdate: (finalQuote: QuoteData) => void;
  isViewingSaved: boolean;
}

const formatCurrency = (value: number, currency: Currency) => {
    const locales: Record<Currency, string> = {
        'BRL': 'pt-BR',
        'USD': 'en-US',
        'EUR': 'pt-PT'
    };
    return (value || 0).toLocaleString(locales[currency], { style: 'currency', currency });
};

// Component for editable fields
const EditableField: React.FC<{label: string, value: string, onChange: (value: string) => void, placeholder?: string, large?: boolean}> = ({ label, value, onChange, placeholder, large = false }) => (
    <div>
        <label className="block text-sm font-medium text-gray-500">{label}</label>
        {large ? (
            <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" rows={4}></textarea>
        ) : (
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
        )}
    </div>
);

// New component for static fields used in PDF generation
const StaticField: React.FC<{label: string, value: string | React.ReactNode, large?: boolean, className?: string}> = ({ label, value, large = false, className = '' }) => (
    <div className={`py-1 ${className}`}>
        <p className="block text-sm font-medium text-gray-500 mb-1">{label}</p>
        <div className={`mt-1 w-full p-2 bg-gray-100 rounded-md text-gray-800 break-words ${large ? 'min-h-[80px]' : ''}`}>
            {value || <span className="text-gray-400">-</span>}
        </div>
    </div>
);


export const QuoteResult: React.FC<QuoteResultProps> = ({ quote, userSettings, images, onReset, onSaveOrUpdate, isViewingSaved }) => {
  const [editedQuote, setEditedQuote] = useState<QuoteData>(JSON.parse(JSON.stringify(quote)));
  const [isPrinting, setIsPrinting] = useState(false);
  const [viewMode, setViewMode] = useState<'quote' | 'report'>('quote');
  const [reportData, setReportData] = useState<TechnicalReportData | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const pdfRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Create image previews when images change
  useEffect(() => {
    if (images && images.length > 0) {
        const previews = images.map(file => URL.createObjectURL(file));
        setImagePreviews(previews);
        return () => {
            previews.forEach(url => URL.revokeObjectURL(url));
        }
    } else {
        setImagePreviews([]);
    }
  }, [images]);

  const handlePriceChange = (index: number, value: string) => {
    const newPrice = Number(value);
    if (!isNaN(newPrice)) {
      const newSteps = [...editedQuote.steps];
      newSteps[index] = { ...newSteps[index], userPrice: newPrice };
      setEditedQuote(prev => ({ ...prev, steps: newSteps }));
    }
  };
  
  const handleQuantityChange = (index: number, value: string) => {
    const newQuantity = Number(value);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      const newSteps = [...editedQuote.steps];
      newSteps[index] = { ...newSteps[index], quantity: newQuantity };
      setEditedQuote(prev => ({ ...prev, steps: newSteps }));
    }
  };

  const handleTaxChange = (index: number, value: string) => {
    const newTaxRate = Number(value);
    if (!isNaN(newTaxRate)) {
        const newSteps = [...editedQuote.steps];
        newSteps[index] = { ...newSteps[index], taxRate: newTaxRate };
        setEditedQuote(prev => ({ ...prev, steps: newSteps }));
    }
  };

  const handleDescriptionChange = (index: number, value: string) => {
      const newSteps = [...editedQuote.steps];
      newSteps[index] = { ...newSteps[index], description: value };
      setEditedQuote(prev => ({ ...prev, steps: newSteps }));
  };
  
  const handleTitleChange = (index: number, value: string) => {
    const newSteps = [...editedQuote.steps];
    newSteps[index].title = value;
    setEditedQuote(prev => ({ ...prev, steps: newSteps }));
  };

  const handleClientDataChange = (field: keyof QuoteData, value: string) => {
    setEditedQuote(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = () => {
    onSaveOrUpdate(editedQuote);
  };

  const handleGenerateReport = async () => {
      setIsGeneratingReport(true);
      try {
          const data = await generateTechnicalReport(editedQuote, images, userSettings.companyName);
          setReportData(data);
          setViewMode('report');
      } catch (error) {
          console.error(error);
          alert("Erro ao gerar relatório. Verifique se você enviou imagens.");
      } finally {
          setIsGeneratingReport(false);
      }
  };
  
  const handleDownloadPdf = () => {
    setIsPrinting(true);
  };
  
  useEffect(() => {
    if (isPrinting) {
      const generatePdf = async () => {
        const targetRef = viewMode === 'report' ? reportRef : pdfRef;
        const input = targetRef.current;
        
        if (!input) {
          setIsPrinting(false);
          return;
        }

        const { jsPDF } = jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 10;
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const usableWidth = pdfWidth - margin * 2;
        
        // Selector depends on view mode
        const selector = viewMode === 'report' ? '.pdf-section' : '.pdf-section';
        const sections = Array.from(input.querySelectorAll(selector)) as HTMLElement[];
        
        let cursorY = margin;

        // If report, add initial page
        if (viewMode === 'report') {
             // Just iterate sections
        }

        for (const section of sections) {
          // Check for page break before
          if (section.classList.contains('break-before-page')) {
             pdf.addPage();
             cursorY = margin;
          }

          const canvas = await html2canvas(section, {
            scale: 2,
            useCORS: true,
            width: section.offsetWidth,
            height: section.offsetHeight,
            logging: false,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          
          const ratio = usableWidth / imgWidth;
          const pdfImageHeight = imgHeight * ratio;

          if (cursorY + pdfImageHeight > pdfHeight - margin) {
            pdf.addPage();
            cursorY = margin;
          }

          pdf.addImage(imgData, 'PNG', margin, cursorY, usableWidth, pdfImageHeight);
          cursorY += pdfImageHeight + 5;
        }
        
        const fileName = viewMode === 'report' 
            ? `laudo-${editedQuote.clientName.replace(/\s/g, '_')}.pdf`
            : `orcamento-${editedQuote.clientName.replace(/\s/g, '_')}.pdf`;
            
        pdf.save(fileName);
        setIsPrinting(false);
      };
      
      // Allow DOM to settle (esp for images)
      setTimeout(generatePdf, 500);
    }
  }, [isPrinting, editedQuote, userSettings, viewMode, reportData]);


  const { subtotal, totalTax, grandTotal } = useMemo(() => {
    const sub = editedQuote.steps.reduce((acc, step) => acc + (Number(step.userPrice || 0) * Number(step.quantity || 0)), 0);
    const tax = editedQuote.steps.reduce((acc, step) => acc + ((Number(step.userPrice || 0) * Number(step.quantity || 0)) * (Number(step.taxRate || 0) / 100)), 0);
    return {
        subtotal: sub,
        totalTax: tax,
        grandTotal: sub + tax,
    };
  }, [editedQuote.steps]);
  
  const renderQuoteContent = () => (
      <div id="pdf-content-inner" className="p-4 sm:p-8 bg-white">
        {(userSettings.companyName || userSettings.companyLogo) && (
          <div className="pdf-section flex justify-between items-start p-4 border-b-2 border-gray-200 mb-8">
            {userSettings.companyLogo && (
              <img src={userSettings.companyLogo} alt="Logo da Empresa" className="h-16 max-w-[150px] object-contain" />
            )}
            <div className="text-right text-xs text-gray-600">
              <p className="font-bold text-base text-gray-800">{userSettings.companyName}</p>
              <p>{userSettings.companyAddress}</p>
              <p>NIF: {userSettings.companyTaxId}</p>
            </div>
          </div>
        )}

        <div className="pdf-section text-center p-4 bg-primary text-white rounded-xl">
          <h2 className="text-2xl font-bold">{editedQuote.title}</h2>
          <p className="mt-1 text-base opacity-90">{editedQuote.summary}</p>
        </div>

        <div className="pdf-section p-4 border border-gray-200 rounded-lg mt-6 mb-6 space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Dados do Cliente</h3>
            {isPrinting ? (
                <>
                    <StaticField label="Nome do Cliente" value={editedQuote.clientName} />
                    <StaticField label="Endereço" value={editedQuote.clientAddress} />
                    <StaticField label="Contato" value={editedQuote.clientContact} />
                </>
            ) : (
                <>
                    <EditableField label="Nome do Cliente" value={editedQuote.clientName} onChange={val => handleClientDataChange('clientName', val)} placeholder="Nome do Cliente" />
                    <EditableField label="Endereço" value={editedQuote.clientAddress} onChange={val => handleClientDataChange('clientAddress', val)} placeholder="Endereço da Obra" />
                    <EditableField label="Contato" value={editedQuote.clientContact} onChange={val => handleClientDataChange('clientContact', val)} placeholder="Email ou Telefone" />
                </>
            )}
        </div>
        
        <div className="space-y-4">
          <h3 className="pdf-section text-2xl font-semibold text-gray-800 border-b-2 border-primary pb-2">Etapas do Serviço</h3>
          {editedQuote.steps.map((step, index) => {
            const lineTotal = (Number(step.userPrice) || 0) * (Number(step.quantity) || 0);
            const lineTotalWithTax = lineTotal * (1 + (Number(step.taxRate) || 0) / 100);
            return (
                <div key={index} className="pdf-section p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200" style={{ breakInside: 'avoid' }}>
                  {isPrinting ? (
                      <StaticField label={`Etapa ${index + 1}`} value={step.title} />
                  ) : (
                      <EditableField label={`Etapa ${index + 1}`} value={step.title} onChange={val => handleTitleChange(index, val)} />
                  )}
                  <div className="mt-2">
                    {isPrinting ? (
                        <StaticField label="Descrição do Serviço" value={step.description} large />
                    ) : (
                        <EditableField label="Descrição do Serviço" value={step.description} onChange={val => handleDescriptionChange(index, val)} large />
                    )}
                  </div>

                  {isPrinting ? (
                    <div className="mt-4 border-t pt-3">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 font-medium">
                                    <th>Preço Unit.</th>
                                    <th>Quantidade</th>
                                    <th>Imposto</th>
                                    <th className="text-right">Total da Etapa</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="text-gray-800">
                                    <td>{formatCurrency(step.userPrice, editedQuote.currency)}</td>
                                    <td>{step.quantity} {step.suggestedUnit ? `(${step.suggestedUnit})` : ''}</td>
                                    <td>{step.taxRate ?? 0}%</td>
                                    <td className="text-right font-semibold">{formatCurrency(lineTotalWithTax, editedQuote.currency)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-4 items-end">
                        <div className="text-sm text-gray-500 bg-gray-100 p-2 rounded-md h-full col-span-2 sm:col-span-1">
                            Preço Unit. Sugerido (IA):
                            <span className="font-semibold text-gray-700 block text-lg">
                                {formatCurrency(step.suggestedPrice, editedQuote.currency)}
                            </span>
                            {step.suggestedUnit && (
                                <span className="text-xs text-gray-500 block">({step.suggestedUnit})</span>
                            )}
                        </div>
                        <div className="relative">
                            <label htmlFor={`quantity-${index}`} className="block text-sm font-medium text-gray-700">Quantidade</label>
                            <input
                                id={`quantity-${index}`}
                                type="number"
                                step="0.01"
                                value={step.quantity}
                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-lg font-semibold"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor={`price-${index}`} className="block text-sm font-medium text-gray-700">Seu Preço Unit.</label>
                            <input
                                id={`price-${index}`}
                                type="number"
                                step="0.01"
                                value={step.userPrice}
                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-lg font-semibold"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor={`tax-${index}`} className="block text-sm font-medium text-gray-700">Imposto (IVA)</label>
                            <select
                                id={`tax-${index}`}
                                value={step.taxRate ?? 0}
                                onChange={(e) => handleTaxChange(index, e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-lg appearance-none"
                            >
                                <option value="0">0%</option>
                                <option value="6">6%</option>
                                <option value="11">11%</option>
                                <option value="23">23%</option>
                            </select>
                        </div>
                        <div className="text-sm text-gray-800 bg-blue-50 p-2 rounded-md h-full text-right">
                            Total da Etapa:
                            <span className="font-semibold text-primary block text-lg">
                                {formatCurrency(lineTotalWithTax, editedQuote.currency)}
                            </span>
                        </div>
                    </div>
                  )}
                </div>
            );
          })}
        </div>

        <div className="pdf-section mt-8 pt-4 border-t-2 border-dashed space-y-2">
            <div className="flex justify-between items-center text-gray-700 px-4">
                <h3 className="text-lg font-medium">Subtotal:</h3>
                <p className="text-lg font-medium">{formatCurrency(subtotal, editedQuote.currency)}</p>
            </div>
             <div className="flex justify-between items-center text-gray-700 px-4">
                <h3 className="text-lg font-medium">Impostos (IVA):</h3>
                <p className="text-lg font-medium">{formatCurrency(totalTax, editedQuote.currency)}</p>
            </div>
            <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg mt-2">
                <h3 className="text-xl font-bold text-gray-800">Total do Orçamento:</h3>
                <p className="text-2xl font-extrabold text-primary">{formatCurrency(grandTotal, editedQuote.currency)}</p>
            </div>
        </div>
        
        {/* Seção de Prazos e Condições (Nova) */}
        <div className="pdf-section mt-8 border-t border-gray-300 pt-6">
             <h3 className="text-lg font-semibold text-gray-800 mb-4">Condições Gerais</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                     {isPrinting ? (
                         <StaticField label="Prazo de Execução" value={editedQuote.executionTime} />
                     ) : (
                         <EditableField 
                             label="Prazo de Execução (Estimado)" 
                             value={editedQuote.executionTime || ''} 
                             onChange={val => handleClientDataChange('executionTime', val)} 
                             placeholder="Ex: 3 a 5 dias úteis"
                         />
                     )}
                </div>
                <div>
                    {isPrinting ? (
                        <StaticField label="Forma de Pagamento" value={editedQuote.paymentTerms} />
                    ) : (
                        <EditableField 
                            label="Forma de Pagamento (Sugerida)" 
                            value={editedQuote.paymentTerms || ''} 
                            onChange={val => handleClientDataChange('paymentTerms', val)}
                            placeholder="Ex: 50% de sinal e 50% na entrega"
                        />
                    )}
                </div>
             </div>
        </div>

        <p className="pdf-section text-xs text-gray-400 text-center mt-8">Orçamento gerado em {new Date(editedQuote.date).toLocaleDateString('pt-BR')}</p>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Toggle Bar */}
       <div className="flex justify-center space-x-4 mb-4">
            <button
                onClick={() => setViewMode('quote')}
                className={`px-4 py-2 rounded-full font-medium transition ${viewMode === 'quote' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
                Orçamento
            </button>
            {(reportData || images.length > 0) && (
                <button
                    onClick={() => reportData ? setViewMode('report') : handleGenerateReport()}
                    disabled={isGeneratingReport}
                    className={`px-4 py-2 rounded-full font-medium transition flex items-center ${viewMode === 'report' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                   {isGeneratingReport ? 'Gerando Relatório...' : 'Laudo Técnico'}
                   {!reportData && !isGeneratingReport && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Novo</span>}
                </button>
            )}
       </div>

      {viewMode === 'quote' ? (
        <div ref={pdfRef}>
          {renderQuoteContent()}
        </div>
      ) : (
          reportData && (
            <div ref={reportRef}>
                <TechnicalReport 
                    data={reportData} 
                    onUpdate={setReportData}
                    userSettings={userSettings} 
                    images={imagePreviews} 
                    isPrinting={isPrinting} 
                />
            </div>
          )
      )}
      
      {!isPrinting && (
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button onClick={handleDownloadPdf} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-secondary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition">
              <DownloadIcon className="h-5 w-5 mr-2" />
              {viewMode === 'quote' ? 'Baixar Orçamento (PDF)' : 'Baixar Laudo (PDF)'}
          </button>
          {viewMode === 'quote' && (
            <button
                onClick={handleSave}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
            >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                {isViewingSaved ? 'Salvar Alterações' : 'Finalizar e Salvar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
