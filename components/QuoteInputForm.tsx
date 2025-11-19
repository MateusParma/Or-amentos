
import React, { useState, useRef } from 'react';
import { CameraIcon, UploadIcon, GlobeIcon } from './AppIcons';
import type { Currency } from '../types';

interface QuoteInputFormProps {
  onSubmit: (description: string, city: string, images: File[], currency: Currency, clientName: string, clientAddress: string, clientContact: string) => void;
  isLoading: boolean;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

export const QuoteInputForm: React.FC<QuoteInputFormProps> = ({ onSubmit, isLoading, currency, setCurrency }) => {
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientContact, setClientContact] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray: File[] = Array.from(event.target.files);
      setImages(prevImages => [...prevImages, ...filesArray]);

      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(prevPreviews => [...prevPreviews, ...newPreviews]);
    }
  };
  
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
        const newPreviews = prev.filter((_, i) => i !== index);
        // Revoke the object URL to free up memory
        URL.revokeObjectURL(prev[index]);
        return newPreviews;
    });
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (description && city && clientName) {
      onSubmit(description, city, images, currency, clientName, clientAddress, clientContact);
    } else {
      alert('Por favor, preencha os dados do cliente, a cidade e a descrição do serviço.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <div className="p-4 border border-gray-200 rounded-lg">
         <h3 className="text-lg font-semibold text-gray-800 mb-4">Dados do Cliente</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                <input id="clientName" type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition" placeholder="Ex: João da Silva" required />
            </div>
            <div>
                <label htmlFor="clientContact" className="block text-sm font-medium text-gray-700 mb-1">Contato (Email/Telefone)</label>
                <input id="clientContact" type="text" value={clientContact} onChange={(e) => setClientContact(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition" placeholder="Ex: +351 912 345 678" />
            </div>
            <div className="md:col-span-2">
                <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700 mb-1">Endereço da Obra</label>
                <input id="clientAddress" type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition" placeholder="Ex: Rua das Flores, 123, Lisboa" />
            </div>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            Cidade para Precificação
            </label>
            <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition"
            placeholder="Ex: Lisboa, Portugal"
            required
            />
        </div>
        <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Moeda
            </label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GlobeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition appearance-none"
                >
                    <option value="EUR">Euro (EUR)</option>
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dólar (USD)</option>
                </select>
            </div>
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Descrição do Serviço
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition"
          placeholder="Ex: Preciso consertar um vazamento na parede do banheiro e pintar a área afetada."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fotos do Local (Opcional)</label>
        <div 
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-primary transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="space-y-1 text-center">
            <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <span className="relative rounded-md font-medium text-primary hover:text-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                <span>Carregar arquivos</span>
              </span>
              <p className="pl-1">ou arraste e solte</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF até 10MB</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          multiple
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
        />
      </div>

      {imagePreviews.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700">Imagens Selecionadas:</h3>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {imagePreviews.map((src, index) => (
              <div key={index} className="relative group">
                <img src={src} alt={`Preview ${index}`} className="h-28 w-full object-cover rounded-lg shadow-md" />
                 <button 
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remover imagem"
                 >
                   &#x2715;
                 </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !description || !city || !clientName}
        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary hover:bg-secondary disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
      >
        <UploadIcon className="h-5 w-5 mr-2" />
        Gerar Orçamento Inteligente
      </button>
    </form>
  );
};
