/**
 * Wizard Components
 *
 * Shared reusable components for setup wizards.
 * Extracted from the original SetupWizard for use in per-tool wizards.
 */

import { useState, useEffect } from 'react';
import { useTour } from '@reactour/tour';
import type { RecurringItem } from '../../types';
import type { PendingLink } from '../LinkCategoryModal';
import { UI } from '../../constants';
import {
  formatCurrency,
  formatFrequency,
  formatDueDate,
} from '../../utils';

// Re-export utilities from centralized location for backward compatibility
export {
  formatCurrency,
  formatFrequency,
  formatDueDate,
  FREQUENCY_ORDER,
} from '../../utils';

// ============================================================================
// Icon Components
// ============================================================================

export function AppIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg" className="app-icon">
      <rect width="192" height="192" rx="32" fill="var(--app-icon-bg)" stroke="var(--app-icon-border)" strokeWidth="3" className="app-icon-bg"/>
      <defs>
        <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ff692d' }}/>
          <stop offset="100%" style={{ stopColor: '#ff8f5a' }}/>
        </linearGradient>
      </defs>
      <g transform="translate(26, 26) scale(1.4)" fill="url(#wingGradient)">
        <path d="m32.527 56.156c0.80078 0.4375 1.4258 1.0117 2.0703 1.6445 0.0625 0.058594 0.13281 0.11719 0.19531 0.17969 2.3281 2.1875 4.1094 5.6758 5.0039 8.7031 0.12891 0.39844 0.29297 0.77344 0.45703 1.1602 0.3125 0.77734 0.57422 1.5664 0.84375 2.3555 0.19531-0.35938 0.29297-0.71875 0.38281-1.1172 0.019531-0.078125 0.035156-0.14844 0.050781-0.22266 0.125-0.54688 0.23438-1.0938 0.33984-1.6406 1.207-6.2539 1.207-6.2539 3.0391-7.7031 0.27344-0.16797 0.47656-0.22266 0.78906-0.21484 0.34375 0.078125 0.46875 0.16406 0.69531 0.42969 0.10547 0.26953 0.10547 0.26953 0.042969 0.53906-0.13672 0.23047-0.13672 0.23047-0.4375 0.42969-0.082031 0.015625-0.16016 0.023437-0.25 0.035156-0.43359 0.11328-0.55078 0.44922-0.76562 0.8125-0.75 1.4375-1.125 2.9844-1.4844 4.5508 0.39062-0.59766 0.39062-0.59766 0.66797-1.2539 0.1875-0.48438 0.4375-0.89453 0.71875-1.3242 0.039062-0.066406 0.082031-0.12891 0.125-0.19141 0.34375-0.50391 0.70312-0.9375 1.3008-1.1289 0.28516 0 0.28516 0 0.52734 0.10938 0.16016 0.19141 0.16016 0.19141 0.21875 0.47266-0.085938 0.47266-0.35938 0.73828-0.71094 1.0586-0.17578 0.1875-0.28516 0.37891-0.41016 0.60938-0.050781 0.085937-0.097656 0.17578-0.15234 0.26953-0.050781 0.09375-0.10156 0.1875-0.15625 0.28516-0.078125 0.15234-0.078125 0.15234-0.16016 0.30469-0.94141 1.7578-1.6719 3.6172-2.3711 5.4922 0.8125-0.67188 1.5586-1.4102 2.2344-2.2109 0.21484-0.24219 0.4375-0.46484 0.66797-0.6875 0.078125-0.085938 0.16016-0.16797 0.24609-0.25 0.45703-0.47656 0.91016-0.88281 1.4531-1.25 0.16406-0.16797 0.33203-0.33594 0.5-0.5 0.16406-0.14062 0.33594-0.28125 0.50781-0.42188 0.29297-0.23438 0.58984-0.47656 0.875-0.72656 0.71875-0.61328 1.4648-1.1328 2.25-1.6445 0.21875-0.14062 0.42969-0.28516 0.64062-0.43359 0.95312-0.63281 1.9609-1.082 3.0273-1.4766 0.089844-0.03125 0.17578-0.0625 0.26953-0.10156 0.69531-0.23438 1.3984-0.26953 2.1328-0.29688 0.11719-0.007812 0.11719-0.007812 0.24219-0.015625 0.72656-0.019531 1.1836 0.17969 1.7109 0.65625 0.30469 0.32422 0.33594 0.58984 0.36719 1.0273-0.070312 2.0156-1.207 3.5781-2.4297 5.0938-0.22656 0.27734-0.44531 0.55859-0.66797 0.84375-0.26562 0.33984-0.53125 0.67578-0.80078 1.0156-0.59375 0.76562-1.0586 1.5977-1.4297 2.4961-0.24219 0.58203-0.52344 1.0703-0.89453 1.582-0.09375 0.14453-0.19141 0.29688-0.28516 0.44141-0.83984 1.25-1.9141 2.6211-3.3125 3.2578h-0.20312c0.003906 0.054687 0.007812 0.10938 0.015625 0.16406 0.097656 2.1484-1.0898 3.9336-2.4648 5.4766-0.85547 0.92188-2.3789 1.8008-3.6562 1.8789-0.0625-0.003906-0.12891-0.011719-0.19141-0.019531-0.33594 1.2812-0.33594 1.2812-0.15625 2.5547 0.17578 0.51172 0.1875 0.99609 0.19141 1.5273 0 0.125 0 0.125 0.003906 0.25-0.003906 0.57422-0.11328 0.90234-0.49219 1.3438-0.375 0.3125-0.875 0.27734-1.3398 0.26953-0.51953-0.078125-0.79688-0.33594-1.1094-0.74219-0.53516-0.76562-0.61328-1.8359-0.45703-2.7344 0.17969-0.84375 0.45703-1.6055 0.85938-2.3672-0.10156 0.011719-0.19922 0.027344-0.30469 0.042969-0.46094 0.003906-0.70312-0.25391-1.0312-0.5625-0.56641-0.60938-0.59766-1.3906-0.62891-2.1836-0.003906-0.078125-0.003906-0.15625-0.011719-0.23438-0.007812-0.1875-0.019531-0.375-0.023437-0.5625-0.11719 0.046875-0.11719 0.046875-0.22656 0.10156-0.39062 0.14062-0.6875 0.11719-1.0781 0-0.34766-0.27734-0.50781-0.46875-0.59766-0.90234-0.046875 0.050781-0.097656 0.097656-0.14453 0.15625-1.0273 1.0625-2.0625 2.0508-3.2734 2.9102-0.125 0.09375-0.25391 0.18359-0.37891 0.27734-0.48047 0.35547-0.48047 0.35547-0.70312 0.35547v0.20312c-0.89062 0.67969-1.7969 0.72266-2.875 0.62891-0.50391-0.066406-0.90234-0.26562-1.3242-0.53125-0.13281-0.078125-0.13281-0.078125-0.26953-0.15234-0.45312-0.26562-0.89453-0.55078-1.332-0.84766v0.17578c-0.046875 1.0234-0.44922 1.8359-1.1992 2.5312-0.60938 0.52344-1.125 0.75781-1.9258 0.73438-0.51562-0.078125-0.875-0.3125-1.2109-0.70312-0.33203-0.50391-0.33203-0.97266-0.22656-1.5391 0.20312-0.69922 0.76562-1.168 1.3789-1.5273 0.066406-0.035156 0.13672-0.074219 0.20312-0.10938 0.58984-0.34766 0.84375-0.95703 1.1211-1.5625 0.15625-0.76172 0.125-1.3164-0.28906-1.9844-0.19531-0.28125-0.39844-0.55078-0.60938-0.82812-0.4375-0.57812-0.61328-1.0664-0.64062-1.7852-0.007812-0.074219-0.015625-0.14844-0.019531-0.22656-0.042969-0.80078 0.23047-1.4766 0.73047-2.0938 0.41016-0.4375 0.89453-0.75391 1.3906-1.082 0.070312-0.058594 0.14062-0.11328 0.21875-0.17188 0.17969-0.12891 0.17969-0.12891 0.37891-0.12891 0.15234-0.33594 0.19922-0.52344 0.19922-0.89844-0.16406-0.25391-0.16406-0.25391-0.375-0.51562-0.38281-0.50781-0.62109-0.98438-0.82422-1.5859-0.035156-0.09375-0.066406-0.19531-0.10547-0.29297-0.61719-1.7617-0.78516-3.668-0.003906-5.4102 0.13672-0.27734 0.28125-0.55469 0.42188-0.82422 0.57422-1.1055 0.64453-1.875 0.28516-3.0742-0.42188-1.4922-0.47266-2.875 0.14062-4.3203 1.3047-2.2031 4.4336-1.0078 6.2891-0.12109z"/>
        <path d="m71.301 36.043c0.070313 0 0.14062-0.007813 0.21484-0.007813 0.37891 0 0.62891 0.0625 0.92188 0.29688 0.48828 0.49609 0.67578 1.043 0.68359 1.7266-0.007813 0.46875-0.078125 0.89062-0.18359 1.3477-0.25391 1.1289-0.23438 1.875 0.28125 2.9336 0.44922 0.98438 0.44922 2.2109 0.078125 3.2266-0.046875 0.11719-0.046875 0.11719-0.097656 0.23438-0.039063 0.09375-0.074219 0.1875-0.10938 0.28125-0.23438 0.54688-0.48047 0.98438-0.89062 1.418 0.14062 0.44141 0.32031 0.62891 0.6875 0.90234 0.47656 0.34766 0.90625 0.73438 1.1133 1.2969 0.12109 1.0547-0.074219 1.6953-0.71875 2.5078-0.28125 0.36719-0.39453 0.61719-0.37891 1.0938 0.16016 0.77344 0.52344 1.168 1.1641 1.6094 0.32031 0.25781 0.49609 0.51172 0.57812 0.91406 0.007813 0.42188-0.023437 0.64453-0.23828 1.0195-0.38672 0.32422-0.69922 0.47266-1.207 0.45703-0.63672-0.24219-1.1641-0.74219-1.4805-1.3359-0.125-0.38281-0.14062-0.67188-0.12109-1.0625-0.050781 0.035156-0.10938 0.078125-0.16406 0.11719-0.88672 0.61719-1.7148 0.99609-2.8281 0.83984-0.63281-0.18359-1.1484-0.6875-1.6328-1.1094-0.21875-0.1875-0.44531-0.35547-0.67969-0.52734-0.35938-0.28125-0.65234-0.59375-0.94531-0.94141-0.14062-0.17188-0.28906-0.32812-0.44531-0.48047-0.023438 0.058594-0.039063 0.12109-0.058594 0.1875-0.14453 0.21094-0.14453 0.21094-0.48828 0.34375-0.35547 0.070313-0.35547 0.070313-0.65625-0.03125-0.011719 0.09375-0.023438 0.19531-0.039063 0.29297-0.019531 0.1875-0.019531 0.1875-0.046875 0.37891-0.023437 0.1875-0.023437 0.1875-0.050781 0.38281-0.066406 0.37891-0.11328 0.63281-0.42578 0.86719-0.51562 0.27734-0.51562 0.27734-0.73438 0.27734 0.023437 0.089844 0.054687 0.18359 0.085937 0.27734 0.32031 1.0391 0.5 1.8984 0.011719 2.9219-0.20703 0.30469-0.20703 0.30469-0.5 0.5-0.48828 0.09375-0.87109 0.070312-1.3086-0.16797-0.27344-0.33203-0.29688-0.60547-0.28516-1.0312 0.011719-0.10547 0.019531-0.20703 0.03125-0.3125s0.015625-0.20703 0.027344-0.3125c0.035156-0.27734 0.035156-0.27734 0.13281-0.57422 0.011719-0.1875 0.015625-0.36719 0.015625-0.55078v-0.29297c-0.003906-0.26953-0.003906-0.26953-0.11328-0.55469-0.21484-0.09375-0.21484-0.09375-0.47266-0.16406-1.4609-0.50391-2.3203-1.4102-2.9922-2.7695-0.33203-0.76562-0.45312-1.4336-0.4375-2.2695-0.085937-0.023438-0.17578-0.046875-0.26953-0.074219-1.5039-0.57422-2.4492-2.8086-3.0977-4.1875-0.32422-0.68359-0.67969-1.2617-1.1484-1.8477-0.72656-0.91797-1.3438-1.8555-1.6797-2.9922-0.054688-0.14453-0.054688-0.14453-0.10156-0.29688-0.039062-0.51953 0-0.86328 0.29688-1.3008 0.75-0.45312 1.5391-0.40234 2.375-0.21875 0.96875 0.29688 1.7773 0.76953 2.625 1.3164 0.14844 0.085938 0.14844 0.085938 0.29297 0.16797 0.10547 0.066406 0.10547 0.066406 0.20703 0.13672v0.19531c0.058594 0.027344 0.12109 0.058594 0.17969 0.085938 0.83594 0.44141 1.5547 1.1484 2.2227 1.8164 0.16016 0.14453 0.32422 0.28516 0.48828 0.43359 0.69922 0.625 1.2656 1.3281 1.8398 2.0664 0.15625 0.20703 0.15625 0.20703 0.37109 0.30078-0.23438-0.72656-0.5-1.4414-0.78906-2.1484-0.039062-0.10938-0.082031-0.21875-0.125-0.32812-0.41406-1.1094-0.41406-1.1094-1.125-2.0391-0.16016-0.1875-0.16016-0.1875-0.13281-0.5625 0.023437-0.10156 0.046875-0.21094 0.070312-0.32031 0.38281-0.046875 0.54688-0.042969 0.85156 0.19141 0.51953 0.63672 0.875 1.2344 1.1484 2.0039-0.30078-1.5703-0.30078-1.5703-1-3-0.19531-0.10156-0.39453-0.20703-0.59766-0.29688-0.10547-0.25-0.10547-0.25-0.097656-0.5 0.10156-0.17969 0.10156-0.17969 0.29688-0.30078 0.30078-0.0625 0.5-0.050781 0.77344 0.089844 1.4609 1.0703 1.6992 3.7539 1.9609 5.4141 0.023437 0.16797 0.050781 0.33594 0.078125 0.5 0.0625 0.39844 0.125 0.79688 0.1875 1.1953 0.070312-0.17969 0.070312-0.17969 0.14453-0.35938 0.21484-0.54688 0.4375-1.0938 0.65625-1.6406 0.035156-0.089844 0.074219-0.18359 0.10938-0.27734 0.48047-1.168 0.98438-2.2695 1.6914-3.3242 0.039063-0.0625 0.078125-0.11719 0.12109-0.1875 1.1562-1.7109 2.5312-3.2109 4.5977-3.7422 0.42969-0.074219 0.84375-0.11719 1.2812-0.125zm-10 9.8594 0.10156 0.19531z"/>
        <path d="m54.5 11.598c1.3008 0.41406 2.3711 1.3594 3.0039 2.5469 1.4141 2.7461 1.4688 5.7344 1.4961 8.7578 0.050781-0.09375 0.10547-0.18359 0.15625-0.27734 0.375-0.65625 0.74609-1.3086 1.1445-1.9414 0.042969-0.070313 0.085938-0.13672 0.125-0.20312 0.36719-0.57812 0.75781-1.1367 1.1719-1.6797 0.0625-0.085937 0.0625-0.085937 0.125-0.17578 0.35938-0.48047 0.84375-0.85938 1.375-1.125 0.32812-0.046875 0.48047-0.003906 0.80469 0.097656 0.19531 0.30469 0.19531 0.30469 0.1875 0.51172-0.089844 0.19141-0.089844 0.19141-0.26562 0.26562-0.078125 0.015625-0.15234 0.03125-0.23047 0.050781-0.96875 0.28906-1.5664 1.2617-2.0938 2.0742-0.03125 0.097656-0.066406 0.19922-0.097656 0.30078 0.054687-0.082031 0.11719-0.16406 0.17969-0.25 0.42969-0.51953 1.043-1.0312 1.6875-1.2383 0.23047-0.011719 0.23047-0.011719 0.46094 0.18359 0.054687 0.066406 0.11328 0.13281 0.17188 0.20312-0.125 0.39062-0.35547 0.5-0.70312 0.67969-0.58594 0.35156-1.043 0.85547-1.4805 1.3711-0.37109 0.42188-0.76172 0.82812-1.1445 1.2383-0.0625 0.0625-0.12109 0.125-0.18359 0.19531-0.050781 0.054687-0.10547 0.10938-0.16016 0.17188-0.14062 0.14453-0.14062 0.14453-0.23047 0.34375 0.09375-0.054688 0.1875-0.10938 0.28516-0.16797 1.0117-0.58203 2.0391-1.0781 3.1172-1.5312 0.10156-0.046875 0.20703-0.089844 0.31641-0.13672 0.71875-0.28906 1.4531-0.51562 2.1914-0.73438 0.10156-0.03125 0.20312-0.054687 0.30469-0.085937 1.5625-0.45312 3.3633-0.8125 4.8828-0.042969 0.32422 0.21875 0.44922 0.45703 0.52344 0.83203 0.019531 0.54297-0.1875 0.85547-0.52344 1.2656-0.0625 0.085938-0.12891 0.16797-0.19141 0.25-0.53125 0.63281-1.0977 1.0312-1.8086 1.4531-0.89844 0.5625-1.7266 1.1562-2.5 1.8984-2.2227 2.1172-2.2227 2.1172-3.5039 2.125-0.097656-0.007813-0.19141-0.015625-0.29297-0.023438-0.019531 0.09375-0.039062 0.19531-0.054687 0.29297-0.28906 0.98438-1.2617 1.8398-2.1016 2.3633-0.64453 0.34375-1.2656 0.53125-2 0.55469-0.73828-0.011719-0.73828-0.011719-1.3203 0.36719-0.16406 0.42188-0.20312 0.875-0.26562 1.3203-0.10156 0.51953-0.28125 1.0234-0.65625 1.3984-0.53125 0.046875-0.875 0.054688-1.3047-0.29688-0.30078-0.5-0.26562-1.0508-0.16016-1.6094 0.19922-0.62891 0.64062-1.1016 1.0625-1.5938-0.078125-0.09375-0.16016-0.1875-0.24609-0.28516-0.30469-0.36328-0.37891-0.59375-0.37891-1.082 0.042969-0.39844 0.18359-0.76172 0.32422-1.1328-0.074219 0.011719-0.14844 0.015625-0.22656 0.027344-0.27344-0.027344-0.27344-0.027344-0.5-0.19922-0.17188-0.22266-0.21875-0.35156-0.27344-0.625-0.09375 0.046875-0.19531 0.10156-0.29688 0.15234-0.8125 0.41016-1.6328 0.74609-2.5078 1.0039-0.085937 0.027344-0.17578 0.054688-0.26562 0.078125-0.8125 0.22656-1.4727 0.17969-2.2266-0.23438-0.25-0.21875-0.47656-0.45703-0.70312-0.70312-0.09375-0.097656-0.19531-0.19531-0.29297-0.28906-0.066406-0.070313-0.13672-0.13672-0.20703-0.21094-0.027344 0.0625-0.054688 0.12109-0.078125 0.18359-0.29688 0.54688-0.83984 0.88672-1.4219 1.0742-0.32031 0.070312-0.57422 0.085937-0.89844 0.046875-0.33594-0.21094-0.59375-0.41406-0.70312-0.80469 0.015625-0.42188 0.054688-0.69531 0.23438-1.0703 0.35547-0.30469 0.72656-0.38281 1.168-0.51562 0.48438-0.17969 0.83984-0.46484 1.1211-0.89844 0.10156-0.27344 0.082031-0.48438 0.046875-0.77344-0.011719-0.14844-0.011719-0.14844-0.027344-0.29297-0.027344-0.24609-0.027344-0.24609-0.14062-0.44922-0.066406-0.74219-0.058594-1.3828 0.40234-2 0.38281-0.40625 0.75-0.57031 1.2695-0.72656 0.32422-0.10156 0.62109-0.23438 0.92578-0.37109-0.015625-0.050781-0.023437-0.10938-0.039062-0.16797-0.3125-1.2852-0.375-2.9414 0.30469-4.1172 0.25-0.36719 0.5-0.72656 0.83594-1.0156h0.20312c0.023437-0.058594 0.054687-0.11719 0.085937-0.17969 0.09375-0.1875 0.20312-0.36719 0.3125-0.54688 0.20312-0.40625 0.25781-0.8125 0.29688-1.2578 0.09375-0.92969 0.26172-1.6992 1-2.3125 0.074219-0.078125 0.15234-0.15625 0.22656-0.24219 0.41016-0.23828 0.72266-0.17578 1.1758-0.0625z"/>
      </g>
    </svg>
  );
}

export function RecurringIcon({ size = 24 }: Readonly<{ size?: number }>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

export function EmptyInboxIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--monarch-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function PackageIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" />
      <polyline points="2.32 6.16 12 11 21.68 6.16" />
      <line x1="12" y1="22.76" x2="12" y2="11" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--monarch-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function LinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// Frequency Icons
function WeeklyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function BiweeklyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01" />
    </svg>
  );
}

function MonthlyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function QuarterlyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <text x="12" y="18" textAnchor="middle" fontSize="8" fill="var(--monarch-orange)" stroke="none">Q</text>
    </svg>
  );
}

function SemiyearlyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <text x="12" y="18" textAnchor="middle" fontSize="8" fill="var(--monarch-orange)" stroke="none">6</text>
    </svg>
  );
}

function YearlyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function FrequencyIcon({ frequency }: { frequency: string }) {
  switch (frequency) {
    case 'weekly':
      return <WeeklyIcon />;
    case 'every_two_weeks':
    case 'twice_a_month':
      return <BiweeklyIcon />;
    case 'monthly':
      return <MonthlyIcon />;
    case 'quarterly':
      return <QuarterlyIcon />;
    case 'semiyearly':
      return <SemiyearlyIcon />;
    case 'yearly':
      return <YearlyIcon />;
    default:
      return <MonthlyIcon />;
  }
}

// ============================================================================
// UI Components
// ============================================================================

interface StepIndicatorProps {
  steps: Array<{ id: string; title: string }>;
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: index <= currentStep ? 'var(--monarch-orange)' : 'var(--monarch-bg-page)',
              color: index <= currentStep ? 'white' : 'var(--monarch-text-muted)',
              border: index === currentStep ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
              transform: index === currentStep ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {index + 1}
          </div>
          {index < steps.length - 1 && (
            <div
              className="w-6 h-0.5 transition-colors duration-300"
              style={{
                backgroundColor: index < currentStep ? 'var(--monarch-orange)' : 'var(--monarch-border)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          {title}
        </div>
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {description}
        </div>
      </div>
    </div>
  );
}

export function MerchantLogo({ item, size = 40 }: { item: RecurringItem; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const displayName = item.merchant_name || item.name;
  const initial = displayName.charAt(0).toUpperCase();

  const colors = [
    '#FF692D', '#4A90D9', '#50C878', '#9B59B6', '#E74C3C',
    '#3498DB', '#1ABC9C', '#F39C12', '#E91E63', '#00BCD4'
  ];
  const colorIndex = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  if (item.logo_url && !imgError) {
    return (
      <img
        src={item.logo_url}
        alt=""
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export interface ItemCardProps {
  item: RecurringItem;
  checked: boolean;
  onChange: () => void;
  onLinkClick: (() => void) | undefined;
  onUnlink: (() => void) | undefined;
  pendingLink: PendingLink | undefined;
}

export function ItemCard({
  item,
  checked,
  onChange,
  onLinkClick,
  onUnlink,
  pendingLink,
}: ItemCardProps) {
  const displayName = item.merchant_name || item.name.split(' (')[0];
  const isLinked = !!pendingLink;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
      style={{
        backgroundColor: checked ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-card)',
        border: checked ? '1px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
      }}
      onClick={onChange}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--monarch-orange)';
          e.currentTarget.style.backgroundColor = 'rgba(255, 105, 45, 0.04)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--monarch-border)';
          e.currentTarget.style.backgroundColor = 'var(--monarch-bg-card)';
        }
      }}
    >
      <div
        className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: checked ? 'var(--monarch-orange)' : 'var(--monarch-border)',
          backgroundColor: checked ? 'var(--monarch-orange)' : 'transparent',
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <MerchantLogo item={item} size={40} />

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" style={{ color: 'var(--monarch-text-dark)' }}>
          {displayName}
        </div>
        <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          {isLinked ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlink?.();
              }}
              className="inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--monarch-success)' }}
              title="Click to unlink"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {pendingLink.categoryIcon && <span>{pendingLink.categoryIcon}</span>}
              {pendingLink.categoryName}
              <span style={{ color: 'var(--monarch-text-muted)' }}>×</span>
            </button>
          ) : (
            formatDueDate(item.next_due_date)
          )}
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2">
        {checked && onLinkClick && !isLinked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLinkClick();
            }}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--monarch-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--monarch-orange)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 105, 45, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--monarch-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Link to existing category"
            data-tour="link-icon"
          >
            <LinkIcon size={16} />
          </button>
        )}
        <div>
          <div className="font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatCurrency(item.monthly_contribution)}/mo
          </div>
          <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            {formatCurrency(item.amount)} {formatFrequency(item.frequency).toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FrequencyGroupProps {
  frequency: string;
  items: RecurringItem[];
  selectedIds: Set<string>;
  pendingLinks: Map<string, PendingLink>;
  onToggleItem: (id: string) => void;
  onToggleGroup: (ids: string[], select: boolean) => void;
  onLinkClick: (item: RecurringItem) => void;
  onUnlink: (itemId: string) => void;
}

export function FrequencyGroup({
  frequency,
  items,
  selectedIds,
  pendingLinks,
  onToggleItem,
  onToggleGroup,
  onLinkClick,
  onUnlink,
}: FrequencyGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const groupIds = items.map(i => i.id);
  const selectedCount = groupIds.filter(id => selectedIds.has(id)).length;
  const allSelected = selectedCount === items.length;
  const someSelected = selectedCount > 0 && selectedCount < items.length;
  const totalMonthly = items.reduce((sum, i) => sum + i.monthly_contribution, 0);

  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <button
          className="p-1"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--monarch-text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <FrequencyIcon frequency={frequency} />

        <div className="flex-1">
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatFrequency(frequency)}
          </span>
          <span className="text-sm ml-2" style={{ color: 'var(--monarch-text-muted)' }}>
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {formatCurrency(totalMonthly)}/mo
        </div>

        <button
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{
            color: allSelected ? 'var(--monarch-text-muted)' : 'var(--monarch-orange)',
            backgroundColor: 'transparent',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleGroup(groupIds, !allSelected);
          }}
        >
          {allSelected ? 'Deselect' : someSelected ? 'Select all' : 'Select all'}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2 mt-2 pl-2">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              checked={selectedIds.has(item.id)}
              onChange={() => onToggleItem(item.id)}
              onLinkClick={() => onLinkClick(item)}
              onUnlink={() => onUnlink(item.id)}
              pendingLink={pendingLinks.get(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface WizardNavigationProps {
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  canGoBack: boolean;
  canProceed: boolean;
  isLastStep: boolean;
  isSaving: boolean;
  nextLabel: string | undefined;
  showSkip?: boolean;
}

export function WizardNavigation({
  onBack,
  onNext,
  onSkip,
  canGoBack,
  canProceed,
  isLastStep,
  isSaving,
  nextLabel,
  showSkip = true,
}: WizardNavigationProps) {
  return (
    <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--monarch-border)' }}>
      <div className="flex gap-3">
        {canGoBack && (
          <button
            onClick={onBack}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg transition-colors btn-hover-lift disabled:opacity-50"
            style={{
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-text-dark)',
              backgroundColor: 'var(--monarch-bg-card)',
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed || isSaving}
          className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift"
          style={{
            backgroundColor: !canProceed || isSaving ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
          }}
          onMouseEnter={(e) => {
            if (canProceed && !isSaving) e.currentTarget.style.backgroundColor = 'var(--monarch-orange-hover)';
          }}
          onMouseLeave={(e) => {
            if (canProceed && !isSaving) e.currentTarget.style.backgroundColor = 'var(--monarch-orange)';
          }}
        >
          {isSaving ? 'Setting up...' : nextLabel || (isLastStep ? 'Get Started' : 'Continue')}
        </button>
      </div>

      {showSkip && onSkip && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onSkip}
            disabled={isSaving}
            className="text-sm px-4 py-1 rounded transition-colors hover:underline disabled:opacity-50"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Skip setup
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tour Components & Styles (for use with @reactour/tour)
// ============================================================================

/**
 * TourController - Syncs external state with @reactour/tour
 *
 * Use this component inside a TourProvider to control the tour from parent state.
 *
 * @example
 * <TourProvider steps={steps} styles={wizardTourStyles}>
 *   <TourController isOpen={showTour} onClose={() => setShowTour(false)} />
 *   {children}
 * </TourProvider>
 */
export function TourController({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { setIsOpen, isOpen: tourIsOpen } = useTour();

  // Sync external state → tour state
  useEffect(() => {
    setIsOpen(isOpen);
  }, [isOpen, setIsOpen]);

  // Notify parent when tour closes internally
  useEffect(() => {
    if (!isOpen) return;

    const checkClosed = () => {
      if (!tourIsOpen) {
        onClose();
      }
    };

    // Small delay to let tour state settle
    const timer = setTimeout(checkClosed, UI.INTERVAL.TOUR_CLOSE_CHECK);
    return () => clearTimeout(timer);
  }, [isOpen, tourIsOpen, onClose]);

  return null;
}

export const wizardTourStyles = {
  popover: (base: object) => ({
    ...base,
    backgroundColor: 'var(--monarch-bg-card)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--monarch-border)',
    padding: '16px',
    maxWidth: '300px',
  }),
  maskArea: (base: object) => ({
    ...base,
    rx: 8,
  }),
  badge: (base: object) => ({
    ...base,
    display: 'none',
  }),
  controls: (base: object) => ({
    ...base,
    marginTop: '12px',
  }),
  close: (base: object) => ({
    ...base,
    color: 'var(--monarch-text-muted)',
    width: '12px',
    height: '12px',
    top: '12px',
    right: '12px',
  }),
};
