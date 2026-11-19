import React from 'react';
import { PlanId } from '../../lib/planEntitlements';
import { EarlyAccessModal } from './EarlyAccessModal';

export interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlanId: PlanId;
  isAnnual?: boolean;
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  targetPlanId,
  isAnnual = true,
}) => {
  return (
    <EarlyAccessModal
      isOpen={isOpen}
      onClose={onClose}
      targetPlanId={targetPlanId}
      isAnnual={isAnnual}
    />
  );
};
