import { useMemo, useState } from 'react';
import {
  AppBar,
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
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useAuthStore } from '../store/authStore';

const drawerWidth = 280;

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const muiTheme = useTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg'));
  const admin = useAuthStore((state) => state.admin);
  const clearSession = useAuthStore((state) => state.clearSession);

  const navItems = useMemo(
    () => [
      { label: 'Dashboard', icon: <DashboardRoundedIcon />, to: '/dashboard' },
      { label: 'Tenants', icon: <ApartmentRoundedIcon />, to: '/tenants' },
      { label: 'Billing', icon: <PaymentsRoundedIcon />, to: '/billing' },
      { label: 'Usage', icon: <InsightsRoundedIcon />, to: '/usage' },
      { label: 'Operations', icon: <BuildRoundedIcon />, to: '/operations' },
      { label: 'Communication', icon: <SmsRoundedIcon />, to: '/communication' },
      { label: 'Support', icon: <SupportAgentRoundedIcon />, to: '/support' },
    ],
    []
  );

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(180deg, rgba(24,48,51,0.98) 0%, rgba(32,75,77,0.96) 72%, rgba(201,104,58,0.92) 100%)',
        color: 'common.white',
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Typography variant="overline" sx={{ opacity: 0.72 }}>
          Taqa SaaS
        </Typography>
        <Typography variant="h5" sx={{ color: 'common.white' }}>
          Platform Console
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
          Cross-tenant operations, billing posture, and support controls.
        </Typography>
      </Box>

      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {navItems.map((item) => {
          const selected = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

          return (
            <ListItemButton
              key={item.to}
              selected={selected}
              onClick={() => {
                navigate(item.to);
                setMobileOpen(false);
              }}
              sx={{
                mb: 0.75,
                borderRadius: 3,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255,255,255,0.14)',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'rgba(255,255,255,0.18)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 42 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ px: 2.5, pb: 3 }}>
        <Button
          fullWidth
          color="inherit"
          variant="outlined"
          startIcon={<LogoutRoundedIcon />}
          onClick={() => {
            clearSession();
            navigate('/login', { replace: true });
          }}
          sx={{
            borderColor: 'rgba(255,255,255,0.35)',
            color: 'common.white',
          }}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(24, 48, 51, 0.08)',
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {!isDesktop ? (
            <IconButton color="primary" onClick={() => setMobileOpen((open) => !open)}>
              <MenuRoundedIcon />
            </IconButton>
          ) : null}

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Operator View</Typography>
            <Typography variant="body2" color="text.secondary">
              Cross-tenant metrics, billing posture, and support controls.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip label={admin?.role ?? 'SUPER_ADMIN'} color="primary" variant="outlined" />
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" fontWeight={700}>
                {admin ? `${admin.firstName} ${admin.lastName}` : 'Platform admin'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {admin?.email}
              </Typography>
            </Box>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              borderRight: 'none',
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
          width: '100%',
          ml: { lg: `${drawerWidth}px` },
          px: { xs: 2, md: 3.5 },
          pb: { xs: 4, md: 6 },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout;
