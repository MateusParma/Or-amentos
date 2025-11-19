
import React from 'react';
import { GearsIcon } from './AppIcons';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <GearsIcon className="h-16 w-16 text-primary animate-spin" />
      <h2 className="mt-4 text-xl font-semibold text-gray-700">Analisando seu projeto...</h2>
      <p className="mt-2 text-gray-500">Nossa IA está montando um orçamento detalhado para você. Isso pode levar alguns segundos.</p>
    </div>
  );
};
