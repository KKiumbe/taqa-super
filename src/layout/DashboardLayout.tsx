import { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import SmsRoundedIcon from '@mui/icons-material/SmsRounded';
import TextsmsRoundedIcon from '@mui/icons-material/TextsmsRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { PlatformSmsSenderProfile } from '../types';

const drawerWidth = 300;
const collapsedWidth = 96;
const smsBalanceFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [smsSender, setSmsSender] = useState<PlatformSmsSenderProfile | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const muiTheme = useTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg'));
  const admin = useAuthStore((state) => state.admin);
  const clearSession = useAuthStore((state) => state.clearSession);
  const desktopSidebarCollapsed = isDesktop && sidebarCollapsed;
  const effectiveDrawerWidth = desktopSidebarCollapsed ? collapsedWidth : drawerWidth;
  const drawerOffset = isDesktop ? effectiveDrawerWidth : 0;

  const navItems = useMemo(
    () => [
      {
        label: 'Dashboard',
        description: 'Daily cross-tenant metrics, billing posture, and activity signals.',
        icon: <DashboardRoundedIcon />,
        to: '/dashboard',
      },
      {
        label: 'Tenants',
        description: 'Search, review, and act on tenants without leaving the console.',
        icon: <ApartmentRoundedIcon />,
        to: '/tenants',
      },
      {
        label: 'Billing',
        description: 'Revenue visibility, invoice controls, and payment follow-through.',
        icon: <PaymentsRoundedIcon />,
        to: '/billing',
      },
      {
        label: 'Usage',
        description: 'Engagement scoring, risk flags, and retention signals.',
        icon: <InsightsRoundedIcon />,
        to: '/usage',
      },
      {
        label: 'Operations',
        description: 'SMS and M-Pesa health, balances, and transaction reliability.',
        icon: <BuildRoundedIcon />,
        to: '/operations',
      },
      {
        label: 'Integrations',
        description: 'Manage tenant SMS and M-Pesa credentials on one page.',
        icon: <ViewSidebarRoundedIcon />,
        to: '/integrations',
      },
      {
        label: 'SMS Configuration',
        description: 'Map tenant SMS credentials with partner IDs and support phones.',
        icon: <TextsmsRoundedIcon />,
        to: '/integrations/sms',
      },
      {
        label: 'M-Pesa Configuration',
        description: 'Manage paybill IDs, pass keys, and secret keys for each tenant.',
        icon: <AccountBalanceWalletRoundedIcon />,
        to: '/integrations/mpesa',
      },
      {
        label: 'SMS Resale',
        description: 'Monitor top-ups, payment linkage, and SMS crediting status.',
        icon: <SmsRoundedIcon />,
        to: '/sms-resale',
      },
      {
        label: 'Communication',
        description: 'Send platform SMS, notes, and billing reminders from one place.',
        icon: <SmsRoundedIcon />,
        to: '/communication',
      },
      {
        label: 'Support',
        description: 'Review support activity and operator actions across the platform.',
        icon: <SupportAgentRoundedIcon />,
        to: '/support',
      },
    ],
    []
  );

  const activeNavItem = useMemo(
    () =>
      navItems.find(
        (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
      ) ?? navItems[0],
    [location.pathname, navItems]
  );

  const workspaceDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
    []
  );

  const adminName = admin ? `${admin.firstName} ${admin.lastName}` : 'Platform admin';
  const adminInitials = admin
    ? `${admin.firstName[0] ?? ''}${admin.lastName[0] ?? ''}`.trim().toUpperCase()
    : 'PA';

  const handleSignOut = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    const loadSmsSender = async () => {
      try {
        const response = await api.get<{ sender: PlatformSmsSenderProfile }>('/support/sms-sender');
        if (!cancelled) {
          setSmsSender(response.data.sender);
        }
      } catch (error) {
        if (!cancelled) {
          setSmsSender(null);
        }
      }
    };

    loadSmsSender();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const drawer = (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        background:
          'linear-gradient(180deg, rgba(16,40,43,0.96) 0%, rgba(32,75,77,0.9) 60%, rgba(9,30,44,0.85) 100%)',
        color: 'common.white',
        borderRight: `1px solid ${alpha(muiTheme.palette.divider, 0.6)}`,
        pb: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header — full when expanded, just toggle when collapsed */}
      {desktopSidebarCollapsed ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2, pb: 1 }}>
          <Tooltip title="Expand sidebar" placement="right">
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setSidebarCollapsed(false)}
              sx={{ border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <ChevronRightRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
          <Chip
            label="Super Admin"
            size="small"
            sx={{
              mb: 1.5,
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: 'common.white',
            }}
          />
          <Typography variant="overline" sx={{ opacity: 0.72 }}>
            Taqa SaaS
          </Typography>
          <Typography variant="h4" sx={{ color: 'common.white', mt: 0.75 }}>
            Platform Console
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            Fast, touch-friendly control surface for platform operations, finance, and support.
          </Typography>
        </Box>
      )}

      {/* User card — avatar only when collapsed */}
      {(desktopSidebarCollapsed || !isDesktop) && (
        <Box
          sx={{
            mx: desktopSidebarCollapsed ? 'auto' : 2.5,
            mb: 2.25,
            p: desktopSidebarCollapsed ? 0 : 2,
            borderRadius: 4,
            border: desktopSidebarCollapsed ? 'none' : '1px solid rgba(255,255,255,0.12)',
            backgroundColor: desktopSidebarCollapsed ? 'transparent' : 'rgba(255,255,255,0.08)',
            backdropFilter: desktopSidebarCollapsed ? 'none' : 'blur(16px)',
            transition: 'all 200ms ease',
          }}
        >
          {desktopSidebarCollapsed ? (
            <Tooltip title={adminName} placement="right">
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'rgba(255,255,255,0.14)',
                  color: 'common.white',
                  fontWeight: 700,
                  cursor: 'default',
                }}
              >
                {adminInitials}
              </Avatar>
            </Tooltip>
          ) : (
            <>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: 'rgba(255,255,255,0.14)',
                    color: 'common.white',
                    fontWeight: 700,
                  }}
                >
                  {adminInitials}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} sx={{ color: 'common.white' }}>
                    {adminName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, wordBreak: 'break-word' }}>
                    {admin?.email ?? 'No email'}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                <Chip
                  size="small"
                  label={admin?.role ?? 'SUPER_ADMIN'}
                  sx={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'common.white' }}
                />
                {smsSender ? (
                  <Chip
                    size="small"
                    label={
                      smsSender.balanceStatus === 'AVAILABLE'
                        ? `SMS ${smsBalanceFormatter.format(smsSender.balance ?? 0)}`
                        : 'SMS Error'
                    }
                    color={smsSender.balanceStatus === 'AVAILABLE' ? 'success' : 'warning'}
                    variant="outlined"
                    onClick={() => navigate('/sms-resale')}
                    sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.25)' }}
                  />
                ) : null}
              </Stack>
            </>
          )}
        </Box>
      )}

      {/* Navigate label + collapse toggle (expanded only) */}
      {!desktopSidebarCollapsed && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ px: 3, pb: 1.5, opacity: 0.9 }}
        >
          <Typography variant="overline" sx={{ flexGrow: 1 }}>
            Navigate
          </Typography>
          {isDesktop ? (
            <Tooltip title="Minimize sidebar">
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setSidebarCollapsed(true)}
                sx={{ border: '1px solid rgba(255,255,255,0.25)' }}
              >
                <ChevronLeftRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      )}

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: 1.5,
          py: 0.5,
          '&::-webkit-scrollbar': {
            width: 4,
          },
        }}
      >
        <List>
          {navItems.map((item) => {
            const selected = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <Tooltip
                key={item.to}
                title={desktopSidebarCollapsed ? item.label : ''}
                placement="right"
              >
                <ListItemButton
                  selected={selected}
                  onClick={() => {
                    navigate(item.to);
                    setMobileOpen(false);
                  }}
                  sx={{
                    mb: 0.75,
                    borderRadius: 3.5,
                    px: desktopSidebarCollapsed ? 1 : 2,
                    py: 0.9,
                    justifyContent: desktopSidebarCollapsed ? 'center' : 'flex-start',
                    transition: 'background-color 200ms ease, padding 200ms ease',
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255,255,255,0.14)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: 'rgba(255,255,255,0.18)',
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'inherit',
                      minWidth: desktopSidebarCollapsed ? 'unset' : 42,
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!desktopSidebarCollapsed && (
                    <ListItemText
                      primary={item.label}
                      secondary={selected ? item.description : undefined}
                      secondaryTypographyProps={{
                        sx: {
                          color: 'rgba(255,255,255,0.68)',
                          mt: 0.25,
                          fontSize: '0.75rem',
                        },
                      }}
                      primaryTypographyProps={{
                        sx: {
                          fontWeight: selected ? 700 : 600,
                        },
                      }}
                      sx={{ flex: 1, ml: 0.5 }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>

      {/* Bottom active-view + sign out */}
      {desktopSidebarCollapsed ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 3, mt: 1 }}>
          <Tooltip title="Sign out" placement="right">
            <IconButton
              color="inherit"
              onClick={handleSignOut}
              sx={{ border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : isDesktop ? (
        <Box sx={{ px: 2.5, pb: 3, pt: 1, mt: 'auto' }}>
          <Button
            fullWidth
            color="inherit"
            variant="outlined"
            startIcon={<LogoutRoundedIcon />}
            onClick={handleSignOut}
            sx={{
              borderColor: 'rgba(255,255,255,0.35)',
              color: 'common.white',
            }}
          >
            Sign out
          </Button>
        </Box>
      ) : (
        <Box sx={{ px: 2.5, pb: 3, mt: 1 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Active View
            </Typography>
            <Typography fontWeight={700} sx={{ color: 'common.white', mt: 0.5 }}>
              {activeNavItem.label}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.75, opacity: 0.78 }}>
              {activeNavItem.description}
            </Typography>
            <Button
              fullWidth
              color="inherit"
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              onClick={handleSignOut}
              sx={{
                mt: 2,
                borderColor: 'rgba(255,255,255,0.35)',
                color: 'common.white',
              }}
            >
              Sign out
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, rgba(255,250,242,0.86) 0%, rgba(244,239,230,0.86) 100%)',
      }}
    >
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha(muiTheme.palette.divider, 0.9)}`,
          width: { lg: `calc(100% - ${drawerOffset}px)` },
          ml: { lg: `${drawerOffset}px` },
          transition: 'width 200ms ease, margin 200ms ease',
        }}
      >
        <Toolbar
          sx={{
            gap: 2,
            minHeight: { xs: 86, md: 94 },
            alignItems: 'flex-start',
            py: 1.5,
          }}
        >
          {!isDesktop ? (
            <IconButton color="primary" onClick={() => setMobileOpen((open) => !open)}>
              <MenuRoundedIcon />
            </IconButton>
          ) : null}

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="overline" color="primary">
              {workspaceDate}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontSize: { xs: '1.45rem', md: '1.85rem' },
              }}
            >
              {activeNavItem.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeNavItem.description}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            justifyContent="flex-end"
            alignItems="center"
          >
            {smsSender ? (
              <Chip
                label={
                  smsSender.balanceStatus === 'AVAILABLE'
                    ? `SMS ${smsBalanceFormatter.format(smsSender.balance ?? 0)}`
                    : 'SMS Error'
                }
                color={smsSender.balanceStatus === 'AVAILABLE' ? 'success' : 'warning'}
                variant="outlined"
                onClick={() => navigate('/sms-resale')}
              />
            ) : null}
            <Chip label={admin?.role ?? 'SUPER_ADMIN'} color="primary" variant="outlined" />
            {isDesktop ? (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight={700}>
                    {adminName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {admin?.email}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: alpha(muiTheme.palette.primary.main, 0.12),
                    color: 'primary.main',
                    fontWeight: 700,
                  }}
                >
                  {adminInitials}
                </Avatar>
              </Stack>
            ) : null}
          </Stack>
        </Toolbar>

        {!isDesktop ? (
          <Box
            sx={{
              px: 2,
              pb: 1.5,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ width: 'max-content', pr: 2 }}>
              {navItems.map((item) => {
                const selected =
                  location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                return (
                  <Chip
                    key={item.to}
                    label={item.label}
                    variant={selected ? 'filled' : 'outlined'}
                    color={selected ? 'primary' : 'default'}
                    onClick={() => navigate(item.to)}
                    sx={{
                      backgroundColor: selected
                        ? muiTheme.palette.primary.main
                        : alpha('#ffffff', 0.58),
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        ) : null}
      </AppBar>

      <Box component="nav" sx={{ width: { lg: effectiveDrawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: effectiveDrawerWidth,
              borderRight: 'none',
              transition: 'width 200ms ease',
              minHeight: '100vh',
              overflow: 'hidden',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          px: { xs: 1, sm: 1.5, md: 2.5 },
          pb: { xs: 10, md: 6 },
          pt: { xs: 1.5, md: 3 },
          transition: 'padding 200ms ease',
        }}
      >
        <Box sx={{ height: { xs: 84, md: 98 } }} />
        <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
