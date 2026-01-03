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
  color = 'currentColor',
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
  color = 'currentColor',
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
  color = 'currentColor',
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

  // Brand
  GitHub: GitHubIcon,
  Reddit: RedditIcon,
  Monarch: MonarchIcon,
};
