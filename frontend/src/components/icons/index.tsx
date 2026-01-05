/**
 * Icon Components
 *
 * Re-exports icons from Lucide React with consistent naming.
 * Custom icons are defined inline for cases where Lucide doesn't have an equivalent.
 *
 * Usage:
 *   import { Icons } from '../components/icons';
 *   <Icons.Settings className="h-5 w-5" />
 *   <Icons.Refresh size={16} color="var(--monarch-orange)" />
 */

import {
  Settings,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Plus,
  Minus,
  Pencil,
  Trash2,
  ExternalLink,
  Link,
  Info,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Menu,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  CalendarClock,
  User,
  Users,
  LogOut,
  Lock,
  Shield,
  ShieldCheck,
  Key,
  Moon,
  Sun,
  Tv,
  Music,
  Wifi,
  Phone,
  Zap,
  Droplet,
  Flame,
  Car,
  Heart,
  Home,
  Gamepad2,
  Dumbbell,
  Cloud,
  Newspaper,
  Repeat,
  Inbox,
  Package,
  Ban,
  Eye,
  EyeOff,
  Download,
  Copy,
  Folder,
  Bookmark,
  Circle,
  Frown,
  Hourglass,
  RotateCw,
  Gift,
  HeartHandshake,
  HelpCircle,
  Server,
  Monitor,
  Globe,
  Bird,
  Rocket,
  Trophy,
  Lightbulb,
  Waypoints,
  SearchAlert,
  CloudSun,
} from 'lucide-react';
import type { SVGProps } from 'react';

export type { LucideProps } from 'lucide-react';

// Re-export types for backwards compatibility
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

// =============================================================================
// Core Icons (re-exports with our naming convention)
// =============================================================================

export const SettingsIcon = Settings;
export const RefreshIcon = RefreshCw;
export const SyncIcon = RefreshCw;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const ChevronRightIcon = ChevronRight;
export const ChevronLeftIcon = ChevronLeft;
export const CheckIcon = Check;
export const CheckSimpleIcon = Check;
export const XIcon = X;
export const PlusIcon = Plus;
export const MinusIcon = Minus;
export const EditIcon = Pencil;
export const TrashIcon = Trash2;
export const ExternalLinkIcon = ExternalLink;
export const LinkIcon = Link;
export const InfoIcon = Info;
export const HelpIcon = HelpCircle;
export const AlertCircleIcon = AlertCircle;
export const WarningIcon = AlertTriangle;
export const CheckCircleIcon = CheckCircle;
export const ClockIcon = Clock;
export const TrendUpIcon = TrendingUp;
export const TrendDownIcon = TrendingDown;
export const ArrowUpIcon = ArrowUp;
export const ArrowDownIcon = ArrowDown;
export const MenuIcon = Menu;
export const SearchIcon = Search;
export const FilterIcon = Filter;
export const MoreVerticalIcon = MoreVertical;
export const CalendarIcon = Calendar;
export const CalendarRecurringIcon = CalendarClock;
export const UserIcon = User;
export const UsersIcon = Users;
export const LogoutIcon = LogOut;
export const LockIcon = Lock;
export const ShieldIcon = Shield;
export const ShieldCheckIcon = ShieldCheck;
export const KeyIcon = Key;
export const MoonIcon = Moon;
export const SunIcon = Sun;
export const TvIcon = Tv;
export const MusicIcon = Music;
export const WifiIcon = Wifi;
export const PhoneIcon = Phone;
export const ZapIcon = Zap;
export const DropletIcon = Droplet;
export const FlameIcon = Flame;
export const CarIcon = Car;
export const HeartIcon = Heart;
export const HomeIcon = Home;
export const GamepadIcon = Gamepad2;
export const DumbbellIcon = Dumbbell;
export const CloudIcon = Cloud;
export const NewspaperIcon = Newspaper;
export const RepeatIcon = Repeat;
export const InboxIcon = Inbox;
export const PackageIcon = Package;
export const BlockedIcon = Ban;
export const EyeIcon = Eye;
export const EyeOffIcon = EyeOff;
export const DownloadIcon = Download;
export const CopyIcon = Copy;
export const FolderIcon = Folder;
export const BookmarkIcon = Bookmark;
export const CircleIcon = Circle;
export const SadFaceIcon = Frown;
export const HourglassIcon = Hourglass;
export const RotateIcon = RotateCw;
export const GiftIcon = Gift;
export const HeartHandshakeIcon = HeartHandshake;
export const ServerIcon = Server;
export const MonitorIcon = Monitor;
export const GlobeIcon = Globe;
export const BirdIcon = Bird;
export const RocketIcon = Rocket;
export const TrophyIcon = Trophy;
export const LightbulbIcon = Lightbulb;
export const WaypointsIcon = Waypoints;
export const SearchAlertIcon = SearchAlert;
export const CloudSunIcon = CloudSun;

// =============================================================================
// Custom Icons (not available in Lucide)
// =============================================================================

/** Animated spinner icon */
export function SpinnerIcon({
  size = 24,
  color = 'currentColor',
  className = '',
  ...rest
}: IconProps) {
  return (
    <Loader2
      size={size}
      color={color}
      className={`animate-spin ${className}`}
      {...rest}
    />
  );
}

/** Filled check icon (green background with white check) */
export function CheckFilledIcon({
  size = 24,
  color: _color = 'currentColor',
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...rest}
    >
      <circle cx="12" cy="12" r="10" fill="#10B981" />
      <path
        d="M8 12l2.5 2.5L16 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Filled warning icon (yellow/orange background) */
export function WarningFilledIcon({
  size = 24,
  color: _color = 'currentColor',
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...rest}
    >
      <path
        d="M12 2L2 20h20L12 2z"
        fill="#F59E0B"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 9v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="white" />
    </svg>
  );
}

/** Filled alert circle icon (red background) */
export function AlertCircleFilledIcon({
  size = 24,
  color: _color = 'currentColor',
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...rest}
    >
      <circle cx="12" cy="12" r="10" fill="#EF4444" />
      <path d="M12 8v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="white" />
    </svg>
  );
}

/** GitHub icon (brand icon) */
export function GitHubIcon({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      {...rest}
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

/** Reddit icon (brand icon not in Lucide) */
export function RedditIcon({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      {...rest}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm6.67-10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1.04 1.04 0 1 0 .11-.52l-2.39-.5a.26.26 0 0 0-.3.2l-.72 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.6 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .88-1.38zm-9.78 1.22a1.04 1.04 0 1 1 2.08 0 1.04 1.04 0 0 1-2.08 0zm5.98 2.77c-.73.73-2.12.79-2.87.79s-2.14-.06-2.87-.79a.26.26 0 0 1 .37-.37c.46.46 1.44.62 2.5.62s2.04-.16 2.5-.62a.26.26 0 0 1 .37.37zm-.2-1.73a1.04 1.04 0 1 1 0-2.08 1.04 1.04 0 0 1 0 2.08z" />
    </svg>
  );
}

/** Cocoon icon (deployment/hosting) */
export function CocoonIcon({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {/* Main cocoon body - elongated oval */}
      <ellipse cx="12" cy="12" rx="5" ry="8" />
      {/* Silk wrapping lines */}
      <path d="M7.5 8c2.5 1 6.5 1 9 0" />
      <path d="M7 12c2.5 1.2 7.5 1.2 10 0" />
      <path d="M7.5 16c2.5 1 6.5 1 9 0" />
      {/* Attachment point at top */}
      <path d="M12 4v-2" />
      <path d="M10 2h4" />
    </svg>
  );
}

/**
 * Monarch butterfly icon (app logo)
 *
 * Icon: "Butterfly" by Rosa Lia from Noun Project
 * https://thenounproject.com/icon/butterfly-7666562/
 * Licensed under CC BY 3.0 - https://creativecommons.org/licenses/by/3.0/
 */
export function MonarchIcon({
  size = 24,
  color = 'currentColor',
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      {...rest}
    >
      <path
        d="M21 12c0-1.5-.5-3-1.5-4L12 12l7.5 4c1-1 1.5-2.5 1.5-4z"
        opacity="0.3"
      />
      <path d="M12 2C8.5 2 5.5 4 4 7l8 5-8 5c1.5 3 4.5 5 8 5s6.5-2 8-5l-8-5 8-5c-1.5-3-4.5-5-8-5zm0 2c2.5 0 4.5 1.5 5.5 3.5L12 11 6.5 7.5C7.5 5.5 9.5 4 12 4zm0 16c-2.5 0-4.5-1.5-5.5-3.5L12 13l5.5 3.5c-1 2-3 3.5-5.5 3.5z" />
    </svg>
  );
}

/**
 * Butterfly icon
 *
 * Icon: "Butterfly" by Rosa Lia from Noun Project
 * https://thenounproject.com/icon/butterfly-7666564/
 * Licensed under CC BY 3.0 - https://creativecommons.org/licenses/by/3.0/
 */
export function ButterflyIcon({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="5 12 90 90"
      fill={color}
      className={className}
      {...rest}
    >
      <path d="m55.098 16.098c0.24219 0.15234 0.24219 0.15234 0.40234 0.40234 0.082031 0.43359 0.082031 0.66016-0.14453 1.043-0.058594 0.085937-0.12109 0.17188-0.18359 0.25781-0.37109 0.57422-0.60547 1.1367-0.82422 1.7812-0.054687 0.16406-0.054687 0.16406-0.11328 0.32812-0.078125 0.22656-0.15234 0.44922-0.23047 0.67188-0.09375 0.28125-0.19141 0.5625-0.28906 0.84375-0.57812 1.6406-0.875 3.3438-1.1797 5.0547-0.035156 0.20703-0.070312 0.41016-0.10938 0.61719-0.51562 2.9375-0.78516 5.918-1.0391 8.8906-0.007813 0.10156-0.015625 0.19922-0.027344 0.29688-0.0625 0.77734-0.082031 1.5391-0.058594 2.3125 0.0625 0.039063 0.13281 0.070313 0.19922 0.10156 0.050781-0.09375 0.10547-0.19531 0.16016-0.29297 0.26172-0.45312 0.5625-0.87109 0.87109-1.293 0.089844-0.11719 0.089844-0.11719 0.17578-0.24219 0.57031-0.78125 1.1562-1.543 1.793-2.2734 0.050781-0.054687 0.10547-0.11328 0.15625-0.17578 0.40234-0.46875 0.81641-0.92188 1.2383-1.3789 0.25781-0.28125 0.51172-0.5625 0.76172-0.85156 1.25-1.4297 1.25-1.4297 1.9648-2.0312 0.23828-0.21094 0.4375-0.45703 0.63281-0.71094 0.16797-0.17188 0.33594-0.24609 0.54688-0.35156 0.24609-0.23438 0.48047-0.47656 0.71875-0.72656 0.17969-0.17188 0.17969-0.17188 0.38281-0.17188 0.03125-0.10156 0.0625-0.19922 0.097656-0.29688 0.16797-0.15625 0.16797-0.15625 0.39453-0.33594 0.089844-0.066406 0.17969-0.13281 0.26562-0.20703 0.054688-0.042969 0.10547-0.078125 0.16406-0.12109 0.20703-0.16016 0.41406-0.32812 0.625-0.49219 0.16016-0.125 0.32031-0.25 0.48438-0.375l0.23438-0.1875c1.5-1.168 3.3125-1.9688 5.0703-2.6562 0.074219-0.03125 0.14844-0.058594 0.22656-0.089844 0.34375-0.13672 0.67969-0.25391 1.0352-0.35547 0.28516-0.050781 0.28516-0.050781 0.40234-0.17969 0.097656-0.015625 0.19531-0.027344 0.29688-0.039063 0.51953-0.066406 1.0312-0.22656 1.5-0.46094 0.21094-0.027344 0.42188-0.042969 0.63281-0.054688 0.28906-0.039062 0.28906-0.039062 0.62109-0.19141 0.54297-0.21484 1.0938-0.23828 1.668-0.28125 0.10938-0.011719 0.22266-0.015625 0.33594-0.027344 1.8594-0.11719 3.0703 0.15234 4.543 1.3516 0.082031 0.0625 0.17188 0.125 0.25391 0.19141 1.1836 1.0195 1.9805 2.8945 2.1484 4.4102 0.0625 1.3242-0.09375 2.6094-0.70312 3.7969-0.039063 0.078125-0.074219 0.15625-0.11719 0.23438-0.5 0.94531-1.125 1.8086-1.8008 2.6367-0.17188 0.22266-0.32422 0.44922-0.46875 0.69141-0.066406 0.11719-0.14062 0.22656-0.21484 0.33984h-0.19531c-0.027344 0.058594-0.054688 0.10938-0.078125 0.16797-0.125 0.23438-0.125 0.23438-0.32031 0.45703-0.40625 0.54297-0.57812 1.0938-0.50391 1.7773 0.12109 0.50781 0.28516 0.98438 0.50391 1.4609 0.57031 1.2422 0.50781 2.6211 0.19531 3.9375-0.15625 0.33984-0.35547 0.60938-0.60156 0.89844-0.070312 0.10156-0.14453 0.20312-0.22266 0.30469-0.96484 1.1055-2.332 1.8516-3.7305 2.2266-0.23828 0.046875-0.23828 0.046875-0.34375 0.17188-0.19141 0.019531-0.37891 0.039062-0.57031 0.0625-0.24219 0.03125-0.24219 0.03125-0.5 0.125-0.41797 0.14062-0.83984 0.22656-1.2656 0.32031-0.125 0.027344-0.125 0.027344-0.25781 0.058594-0.20312 0.042969-0.40625 0.089844-0.60938 0.12891 0.10938 0.070313 0.21875 0.14062 0.33594 0.21094 1.75 1.1094 3.3203 2.2539 4.0781 4.2539 0.078125 0.20312 0.16016 0.40234 0.25 0.59766 0.38281 0.9375 0.52344 1.9648 0.16406 2.9336-0.33203 0.54688-0.92578 0.91016-1.5234 1.1055h-0.40234c0.53516 1.0312 0.53516 1.0312 1.125 2.0312 0.24609 0.39844 0.41797 0.80078 0.58203 1.2422 0.09375 0.25 0.09375 0.25 0.29297 0.55469 0.27734 0.45312 0.37891 0.97266 0.51562 1.4844 0.058594 0.27344 0.058594 0.27344 0.18359 0.39062 0.085937 1.0195 0.085937 2.3789-0.54297 3.2266-0.54688 0.60547-1.0469 0.99609-1.8555 1.1719h-0.20312c0.19531 0.29688 0.375 0.57031 0.625 0.82422 0.058594 0.058594 0.11719 0.11328 0.17969 0.17578v0.19922c0.054687 0.027344 0.11719 0.050781 0.17578 0.078125 0.23047 0.125 0.375 0.25 0.55078 0.43359 0.0625 0.0625 0.125 0.125 0.1875 0.19141 0.17969 0.1875 0.34375 0.38672 0.51562 0.58203 0.35156 0.40625 0.74219 0.75781 1.1406 1.1094 0.16406 0.15234 0.32422 0.30469 0.47656 0.46094 0.23828 0.22656 0.47656 0.42578 0.73828 0.625 0.39453 0.3125 0.71875 0.64062 1.043 1.0234 0.17969 0.21094 0.375 0.375 0.58594 0.55469 0.375 0.31641 0.5625 0.60938 0.78125 1.0391 0.074219 0.10547 0.14062 0.21094 0.21484 0.3125 0.48047 0.73438 0.66016 1.6211 0.58984 2.4922-0.007813 0.078125-0.011719 0.15625-0.023438 0.23828-0.09375 0.72266-0.41016 1.2031-0.97656 1.6602-0.29688 0.14844-0.57812 0.23438-0.90234 0.29688-0.082031 0.023438-0.16016 0.039063-0.24609 0.058594-1.2109 0.21484-2.5156 0-3.5547-0.65625-0.73047-0.51562-1.4141-1.125-2-1.8008v-0.19922c-0.10156-0.03125-0.19922-0.066406-0.29688-0.097656-0.60547-0.64062-1.0859-1.4023-1.5859-2.125-0.78906-1.1641-0.78906-1.1641-1.6953-2.2305-0.12109-0.14453-0.12109-0.14453-0.12109-0.34766-0.16797-0.0625-0.32812-0.13281-0.5-0.19922-0.058594 0.050781-0.11328 0.10547-0.17188 0.15625-0.95703 0.82422-1.9102 1.2305-3.1836 1.1758-0.81641-0.082031-1.4844-0.24219-2.1445-0.73438-0.64062-0.40625-1.1211-0.53516-1.875-0.50391-1.207 0.019531-2.2344-0.23828-3.1289-1.0625-0.10156-0.097656-0.20312-0.19922-0.30469-0.30078-0.050781-0.054688-0.10156-0.10547-0.15625-0.15625-0.35156-0.36719-0.61328-0.71875-0.83594-1.1719-0.10156-0.20312-0.21484-0.36719-0.35156-0.54688-0.30469-0.42188-0.51953-0.88672-0.75-1.3555-0.085937-0.17188-0.17188-0.34375-0.25781-0.51953-0.19531-0.38672-0.37109-0.77734-0.53906-1.1797-0.21094-0.5-0.4375-0.97266-0.70312-1.4453-0.23828-0.43359-0.42969-0.86719-0.60156-1.3359-0.089844-0.22656-0.089844-0.22656-0.24609-0.42188-0.16016-0.21875-0.23047-0.39453-0.30859-0.65625-0.22266-0.64453-0.53906-1.2266-0.86328-1.8281-0.30859-0.57031-0.58984-1.1445-0.85547-1.7383-0.16016-0.36328-0.34375-0.71875-0.52344-1.0742-0.078125 0.09375-0.15625 0.19531-0.23438 0.29297-0.15625 0.19141-0.24609 0.29688-0.46484 0.40625-0.26172 0.019531-0.51953 0.03125-0.78125 0.035156-0.074219 0.007813-0.14062 0.011719-0.21484 0.011719-0.39844 0.011719-0.57812-0.027344-0.89453-0.28125-0.20703-0.26562-0.20703-0.26562-0.41016-0.56641-0.089844 0.17578-0.17969 0.35156-0.26562 0.53125-0.10156 0.20703-0.20312 0.41016-0.30859 0.61328-0.0625 0.125-0.125 0.24609-0.1875 0.37109-0.089844 0.17188-0.089844 0.17188-0.17578 0.34766-0.14844 0.30859-0.25781 0.61328-0.35938 0.9375-0.070313 0.10938-0.070313 0.10938-0.14062 0.22266-0.14062 0.24609-0.24219 0.46875-0.34375 0.73438-0.19531 0.50781-0.43359 0.98438-0.67969 1.4688-0.10938 0.21484-0.20703 0.42969-0.30078 0.64844-0.10547 0.24219-0.20703 0.47266-0.33203 0.70703-0.14062 0.28516-0.27344 0.57422-0.38672 0.87109-0.38672 0.97266-0.78125 1.9531-1.3125 2.8594-0.10547 0.1875-0.18359 0.36719-0.26172 0.5625-0.14453 0.32812-0.14453 0.32812-0.32812 0.55078-0.20312 0.25391-0.32812 0.48438-0.47266 0.77734-0.5 0.92188-1.1836 1.9062-2.1758 2.3203-0.63672 0.1875-1.2734 0.27734-1.9336 0.27734-0.91016 0-1.3906 0.21484-2.1055 0.73438-0.5 0.35938-0.90625 0.53516-1.5312 0.56641-0.09375 0.007813-0.19141 0.011719-0.28906 0.015625-1.3867 0.054688-2.2617-0.47266-3.3086-1.3164-0.9375 0.92578-1.6289 1.9688-2.3477 3.0664-0.60547 0.92188-1.2969 1.75-2.0234 2.5781-0.11328 0.13672-0.22656 0.27734-0.33594 0.42188-0.53125 0.64062-1.2305 1.1055-1.9922 1.4336-0.11719 0.050781-0.23828 0.10547-0.36328 0.15625-0.47266 0.17578-0.92188 0.19922-1.4258 0.19141h-0.26562c-0.67969-0.019531-1.1992-0.125-1.7461-0.54688-0.0625-0.046875-0.12109-0.085937-0.18359-0.12891-0.55078-0.45703-0.65625-1.1211-0.75-1.7969-0.078125-1.375 0.71875-2.7227 1.5742-3.7461 0.26562-0.29688 0.54688-0.57812 0.85938-0.82812h0.19922c0.039062-0.097656 0.039062-0.097656 0.082031-0.19531 0.12109-0.20312 0.12109-0.20312 0.41797-0.30469 0.066406-0.13281 0.13281-0.26953 0.20312-0.39844 0.19141-0.19531 0.19141-0.19531 0.4375-0.40234 0.97656-0.86328 1.8477-1.7773 2.6602-2.8008 0.31641-0.38281 0.64453-0.74609 1-1.1016 0.03125-0.0625 0.066406-0.12891 0.097656-0.19531-0.050781-0.015625-0.10938-0.03125-0.16406-0.046875-0.90625-0.28125-1.543-0.60547-2.0156-1.4609-0.39062-0.97266-0.49219-2.207-0.11719-3.1953 0.023438-0.125 0.042969-0.25 0.070313-0.38281 0.27344-1.2539 0.90625-2.4102 1.5469-3.5156 0.30078-0.51562 0.51562-1.0234 0.67969-1.6016-0.082031-0.007813-0.16016-0.015625-0.25-0.023438-0.50781-0.10938-0.96094-0.25391-1.3047-0.66406-0.53125-0.82812-0.50781-1.5625-0.32031-2.5117 0.10938-0.47266 0.23438-0.88672 0.47656-1.3086 0.11328-0.21875 0.19141-0.4375 0.26953-0.66406 0.53516-1.3711 1.7031-2.4688 2.9336-3.2266 0.16406-0.10938 0.33594-0.22266 0.50391-0.33203 0.074219-0.046875 0.15234-0.097656 0.23047-0.15234 0.082031-0.054687 0.082031-0.054687 0.16406-0.11719v-0.10156c-0.83203-0.21094-0.83203-0.21094-1.6719-0.38281-1.7734-0.35156-3.3125-0.96875-4.7266-2.1172-0.070313-0.046875-0.14062-0.09375-0.21094-0.14453-0.59766-0.43359-0.82031-1.082-1.0938-1.7539-0.035156-0.078125-0.066406-0.15625-0.10156-0.23438-0.16406-0.45312-0.13281-0.90625-0.13281-1.3828-0.003906-0.097656-0.003906-0.19531-0.007812-0.30078 0-0.71484 0.14453-1.2383 0.44531-1.8789 0.039063-0.10547 0.078125-0.20312 0.12109-0.3125 0.046875-0.11719 0.046875-0.11719 0.097656-0.24219 0.03125-0.078125 0.0625-0.16016 0.09375-0.24219 0.085938-0.20312 0.085938-0.20312 0.1875-0.40625 0.10938-0.87109-0.28516-1.5625-0.78906-2.2617-0.13281-0.16016-0.26562-0.32812-0.40234-0.48828-0.35938-0.43359-0.68359-0.89062-1.0117-1.3516-0.054687-0.082031-0.11719-0.16016-0.17969-0.25-0.99219-1.3828-1.8555-2.8828-1.9062-4.625 0.003906-0.22656 0.003906-0.22656-0.10938-0.42188-0.09375-1.8984 0.85156-3.6602 2-5.1016 0.039062-0.0625 0.085937-0.125 0.13281-0.19531 0.58984-0.80469 1.7422-1.3672 2.7031-1.5703 1.2422-0.11719 2.5469 0 3.7617 0.26562 0.12109 0.023437 0.23438 0.050781 0.35938 0.078125 0.92188 0.20312 0.92188 0.20312 1.043 0.32031 0.11328 0.011719 0.22266 0.023438 0.34375 0.03125 0.44141 0.054688 0.80469 0.19922 1.2188 0.37109 0.30078 0.12891 0.61719 0.20703 0.9375 0.30078 0.23438 0.10156 0.46094 0.19922 0.69531 0.29688 0.13672 0.042969 0.26562 0.089844 0.40234 0.125 0.57422 0.19531 1.1055 0.44922 1.6445 0.71094 0.09375 0.046875 0.19531 0.085937 0.29297 0.14062 0.84766 0.40625 1.6758 0.83594 2.3945 1.4531 0.51172 0.42969 1.0391 0.83203 1.5742 1.2383 0.28516 0.23047 0.53516 0.47266 0.79297 0.73438 0.16406 0.13672 0.33203 0.26953 0.5 0.40234 0.35938 0.28125 0.6875 0.56641 1 0.89844 0.0625 0.054688 0.11719 0.10938 0.17969 0.16797 0.12109 0.12891 0.12109 0.12891 0.12109 0.33203 0.058594 0.027344 0.12109 0.054688 0.17578 0.078125 0.23438 0.125 0.38281 0.26172 0.55859 0.45312 0.066406 0.070313 0.12891 0.13672 0.19141 0.21094 0.070313 0.070312 0.13672 0.14453 0.20312 0.21875 0.14844 0.15625 0.28906 0.3125 0.43359 0.46875 0.074219 0.078125 0.14453 0.15625 0.21875 0.23828 0.20703 0.21875 0.41016 0.4375 0.62109 0.65625 0.67578 0.70312 1.3008 1.4102 1.8828 2.1914 0.18359 0.24219 0.37109 0.46484 0.57031 0.6875 0.76562 0.85938 1.7734 1.9922 2.1445 3.0938 0.097656 0.039063 0.19922 0.070313 0.30078 0.10156 0.16797 0.35938 0.16797 0.35938 0.29688 0.70312h0.20312c-0.050781-0.76172-0.19531-1.4766-0.38281-2.2148-0.03125-0.10938-0.058594-0.22266-0.089844-0.34375-0.089844-0.37109-0.18359-0.73828-0.27734-1.1055-0.050781-0.19141-0.050781-0.19141-0.097656-0.38281-0.48438-1.9297-0.97266-3.8516-1.5508-5.7578-0.039063-0.11328-0.074219-0.23438-0.10938-0.35156-1.0469-3.4141-2.7734-7.9336-5.8516-10.031-0.14062-0.11719-0.14062-0.11719-0.24219-0.3125-0.03125-0.38672-0.054688-0.61719 0.15625-0.94531 0.35156-0.22656 0.53125-0.22266 0.94531-0.15625 2.8594 1.2773 4.7734 5.8203 5.8281 8.5547 0.09375 0.25 0.18359 0.49219 0.27344 0.74219 0.046875 0.13281 0.046875 0.13281 0.09375 0.26562 1.0664 3.0781 1.7891 6.2812 2.6016 9.4375 0.011719-0.070312 0.015625-0.14453 0.023438-0.22266 0.60156-6.2695 0.60156-6.2695 1.0938-9.2031 0.015625-0.09375 0.03125-0.19141 0.046875-0.29297 0.32812-1.9727 0.71094-3.9375 1.3438-5.8438 0.078125-0.22656 0.14844-0.45703 0.22266-0.6875 0.25-0.78125 0.53516-1.5352 0.88672-2.2852 0.03125-0.066406 0.066406-0.13672 0.097656-0.20703 0.37891-0.79297 0.82422-1.5547 1.7852-1.4609z" />
    </svg>
  );
}

/** Butterfly emerging from cocoon icon (eclosion) */
export function ButterflyEmergingIcon({
  size = 24,
  color = 'currentColor',
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {/* Cocoon shell at bottom - cracked open */}
      <path
        d="M8 22c.5-2 2-3.5 4-3.5s3.5 1.5 4 3.5"
        fill={color}
        fillOpacity="0.15"
      />
      <path d="M7 20c1-1.5 2.5-2 5-2s4 .5 5 2" />
      {/* Butterfly body emerging */}
      <path d="M12 18V9" strokeWidth="2" />
      {/* Left wing */}
      <path
        d="M12 11C9 9 5 8 3 10c-1.5 1.5-1 4 1.5 5.5S9 17 12 14"
        fill={color}
        fillOpacity="0.2"
      />
      {/* Right wing */}
      <path
        d="M12 11c3-2 7-3 9-1 1.5 1.5 1 4-1.5 5.5S15 17 12 14"
        fill={color}
        fillOpacity="0.2"
      />
      {/* Upper left wing */}
      <path
        d="M12 9C9 7 5 5 3 7c-1.5 1.5-.5 4 2 5s5.5.5 7-2"
        fill={color}
        fillOpacity="0.3"
      />
      {/* Upper right wing */}
      <path
        d="M12 9c3-2 7-4 9-2 1.5 1.5.5 4-2 5s-5.5.5-7-2"
        fill={color}
        fillOpacity="0.3"
      />
      {/* Antennae */}
      <path d="M10.5 7.5C9 5.5 8 4 7 4" />
      <path d="M13.5 7.5c1.5-2 2.5-3.5 3.5-3.5" />
    </svg>
  );
}

// =============================================================================
// Collected Icons Object
// =============================================================================

/**
 * Icons object for convenient access to all icons.
 *
 * @example
 * import { Icons } from '../components/icons';
 * <Icons.Settings className="h-5 w-5" />
 */
export const Icons = {
  // Core
  Settings: SettingsIcon,
  Refresh: RefreshIcon,
  Sync: SyncIcon,
  Spinner: SpinnerIcon,

  // Chevrons
  ChevronDown: ChevronDownIcon,
  ChevronUp: ChevronUpIcon,
  ChevronRight: ChevronRightIcon,
  ChevronLeft: ChevronLeftIcon,

  // Actions
  Check: CheckIcon,
  CheckSimple: CheckSimpleIcon,
  CheckFilled: CheckFilledIcon,
  X: XIcon,
  Plus: PlusIcon,
  Minus: MinusIcon,
  Edit: EditIcon,
  Trash: TrashIcon,
  ExternalLink: ExternalLinkIcon,
  Link: LinkIcon,

  // Status
  Info: InfoIcon,
  AlertCircle: AlertCircleIcon,
  AlertCircleFilled: AlertCircleFilledIcon,
  Warning: WarningIcon,
  WarningFilled: WarningFilledIcon,
  CheckCircle: CheckCircleIcon,
  Clock: ClockIcon,

  // Trends
  TrendUp: TrendUpIcon,
  TrendDown: TrendDownIcon,
  ArrowUp: ArrowUpIcon,
  ArrowDown: ArrowDownIcon,

  // UI
  Menu: MenuIcon,
  Search: SearchIcon,
  SearchAlert: SearchAlertIcon,
  Filter: FilterIcon,
  MoreVertical: MoreVerticalIcon,

  // Calendar
  Calendar: CalendarIcon,
  CalendarRecurring: CalendarRecurringIcon,

  // User/Auth
  User: UserIcon,
  Users: UsersIcon,
  Logout: LogoutIcon,
  Lock: LockIcon,
  Shield: ShieldIcon,
  ShieldCheck: ShieldCheckIcon,
  Key: KeyIcon,

  // Theme
  Moon: MoonIcon,
  Sun: SunIcon,

  // Category (service type fallbacks)
  Tv: TvIcon,
  Music: MusicIcon,
  Wifi: WifiIcon,
  Phone: PhoneIcon,
  Zap: ZapIcon,
  Droplet: DropletIcon,
  Flame: FlameIcon,
  Car: CarIcon,
  Heart: HeartIcon,
  Home: HomeIcon,
  Gamepad: GamepadIcon,
  Dumbbell: DumbbellIcon,
  Cloud: CloudIcon,
  Newspaper: NewspaperIcon,
  Repeat: RepeatIcon,
  Inbox: InboxIcon,
  Package: PackageIcon,
  Blocked: BlockedIcon,

  // Misc
  Eye: EyeIcon,
  EyeOff: EyeOffIcon,
  Download: DownloadIcon,
  Copy: CopyIcon,
  Folder: FolderIcon,
  Bookmark: BookmarkIcon,
  Circle: CircleIcon,
  SadFace: SadFaceIcon,
  Hourglass: HourglassIcon,
  Rotate: RotateIcon,
  Gift: GiftIcon,
  HeartHandshake: HeartHandshakeIcon,
  Server: ServerIcon,
  Monitor: MonitorIcon,
  Globe: GlobeIcon,
  Lightbulb: LightbulbIcon,
  Waypoints: WaypointsIcon,

  // Brand
  GitHub: GitHubIcon,
  Reddit: RedditIcon,
  Monarch: MonarchIcon,
  Cocoon: CocoonIcon,
  Butterfly: ButterflyIcon,
  ButterflyEmerging: ButterflyEmergingIcon,
  Bird: BirdIcon,
  Rocket: RocketIcon,
  Trophy: TrophyIcon,

  // Weather
  CloudSun: CloudSunIcon,
};
