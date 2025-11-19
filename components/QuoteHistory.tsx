
import React from 'react';
import type { QuoteData, Currency } from '../types';
import { PencilIcon, TrashIcon, EyeIcon } from './AppIcons';

interface QuoteHistoryProps {
  quotes: QuoteData[];
  onNewQuote: () => void;
  onViewQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
}

const formatCurrency = (value: number, currency: Currency) => {
    const locales: Record<Currency, string> = {
        'BRL': 'pt-BR',
        'USD': 'en-US',
        'EUR': 'pt-PT'
    };
    return value.toLocaleString(locales[currency], { style: 'currency', currency });
};

export const QuoteHistory: React.FC<QuoteHistoryProps> = ({ quotes, onNewQuote, onViewQuote, onDeleteQuote }) => {
  if (quotes.length === 0) {
    return (
      <div className="text-center p-12">
        <h2 className="text-xl font-semibold text-gray-700">Nenhum orçamento salvo</h2>
        <p className="mt-2 text-gray-500">Crie seu primeiro orçamento para vê-lo aqui.</p>
        <button
          onClick={onNewQuote}
          className="mt-6 inline-flex items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
        >
          <PencilIcon className="h-5 w-5 mr-2" />
          Criar Novo Orçamento
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Meus Orçamentos</h2>
        <button
          onClick={onNewQuote}
          className="inline-flex items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
        >
          <PencilIcon className="h-5 w-5 mr-2" />
          Criar Novo
        </button>
      </div>
      <ul className="space-y-4">
        {quotes.slice().reverse().map((quote) => {
            const totalPrice = quote.steps.reduce((acc, step) => {
                const price = Number(step.userPrice) || 0;
                const tax = Number(step.taxRate) || 0;
                const quantity = Number(step.quantity) || 1; // Default to 1 for older quotes
                return acc + (price * quantity) * (1 + tax / 100);
            }, 0);
            return (
                <li key={quote.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center group hover:shadow-md transition-shadow">
                    <div className="flex-grow cursor-pointer" onClick={() => onViewQuote(quote.id)}>
                        <h3 className="font-bold text-lg text-secondary group-hover:text-primary transition-colors">{quote.title}</h3>
                        <p className="text-sm text-gray-600">Para: <span className="font-medium">{quote.clientName}</span> - {new Date(quote.date).toLocaleDateString('pt-BR')}</p>
                        <p className="text-md font-semibold text-gray-800 mt-1">Total: {formatCurrency(totalPrice, quote.currency)}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-center">
                        <button
                            onClick={() => onViewQuote(quote.id)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-blue-100 rounded-full transition"
                            aria-label="Ver detalhes do orçamento"
                        >
                            <EyeIcon className="h-5 w-5" />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                onDeleteQuote(quote.id)
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition"
                            aria-label="Deletar orçamento"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                </li>
            );
        })}
      </ul>
    </div>
  );
};
