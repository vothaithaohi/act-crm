'use client';

import React from 'react';
import { TalentMultiStepForm } from '@/components/talents/talent-multi-step-form';

export default function NewTalentPage() {
  return (
    <div className="py-2">
      <TalentMultiStepForm isEdit={false} />
    </div>
  );
}
