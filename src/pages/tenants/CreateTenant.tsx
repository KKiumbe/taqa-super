import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const initialFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  password: '',
  county: '',
  town: '',
  gender: '',
  tenantName: '',
  subscriptionPlan: 'Simba',
  monthlyCharge: '5000',
  allowedUsers: '1',
  numberOfBags: '',
  tenantEmail: '',
  tenantPhoneNumber: '',
  alternativePhoneNumber: '',
  address: '',
  building: '',
  street: '',
  website: '',
  paymentDetails: '',
};

const CreateTenant = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        county: formData.county,
        town: formData.town,
        gender: formData.gender,
        tenantName: formData.tenantName,
        subscriptionPlan: formData.subscriptionPlan,
        monthlyCharge: formData.monthlyCharge,
        allowedUsers: formData.allowedUsers,
        numberOfBags: formData.numberOfBags || null,
        tenantEmail: formData.tenantEmail,
        tenantPhoneNumber: formData.tenantPhoneNumber,
        alternativePhoneNumber: formData.alternativePhoneNumber,
        address: formData.address,
        building: formData.building,
        street: formData.street,
        website: formData.website,
        paymentDetails: formData.paymentDetails,
      };

      const response = await api.post<{
        tenant: {
          id: number;
          name: string;
        };
      }>('/tenants', payload);

      setSuccess(`Created ${response.data.tenant.name}. Redirecting to tenant detail...`);
      setTimeout(() => navigate(`/tenants/${response.data.tenant.id}`), 700);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Add Tenant"
        subtitle="Create a tenant together with the first admin user and billing settings; SMS and M-Pesa credentials are configured separately."
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate('/tenants')}
          >
            Back To Tenants
          </Button>
        }
        eyebrow="Onboarding"
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        <Paper sx={{ p: { xs: 2.25, md: 3 } }}>
          <Stack spacing={0.75} sx={{ mb: 2.5 }}>
            <Typography variant="overline" color="primary">
              Step 1
            </Typography>
            <Typography variant="h5">Admin User</Typography>
            <Typography variant="body2" color="text.secondary">
              Create the first account that will manage the tenant immediately after onboarding.
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required type="email" label="Email" name="email" value={formData.email} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Phone Number" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="County" name="county" value={formData.county} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Town" name="town" value={formData.town} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Gender" name="gender" value={formData.gender} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="password"
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                helperText="At least 6 characters"
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: { xs: 2.25, md: 3 } }}>
          <Stack spacing={0.75} sx={{ mb: 2.5 }}>
            <Typography variant="overline" color="primary">
              Step 2
            </Typography>
            <Typography variant="h5">Tenant Profile</Typography>
            <Typography variant="body2" color="text.secondary">
              Capture the commercial plan, contact channels, and address details that the support and
              billing teams rely on later.
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Tenant Name" name="tenantName" value={formData.tenantName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Subscription Plan" name="subscriptionPlan" value={formData.subscriptionPlan} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Monthly Charge"
                name="monthlyCharge"
                value={formData.monthlyCharge}
                onChange={handleChange}
                inputProps={{ min: 1, step: '0.01' }}
                helperText="Tenant-facing monthly price"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Allowed Users"
                name="allowedUsers"
                value={formData.allowedUsers}
                onChange={handleChange}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth type="number" label="Number Of Bags" name="numberOfBags" value={formData.numberOfBags} onChange={handleChange} inputProps={{ min: 0, step: 1 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="email" label="Tenant Email" name="tenantEmail" value={formData.tenantEmail} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Tenant Phone Number" name="tenantPhoneNumber" value={formData.tenantPhoneNumber} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Alternative Phone Number" name="alternativePhoneNumber" value={formData.alternativePhoneNumber} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Website" name="website" value={formData.website} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" name="address" value={formData.address} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Building" name="building" value={formData.building} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Street" name="street" value={formData.street} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Payment Details" name="paymentDetails" value={formData.paymentDetails} onChange={handleChange} helperText="Optional payment instructions shown to your internal team." />
            </Grid>
          </Grid>
        </Paper>

        <Paper
          sx={{
            p: 2,
            position: 'sticky',
            bottom: { xs: 10, md: 18 },
            zIndex: 2,
            backdropFilter: 'blur(18px)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,250,242,0.96) 100%)',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Box>
              <Typography variant="subtitle2">Ready to onboard</Typography>
              <Typography variant="body2" color="text.secondary">
                Review the required sections, then create the tenant and add SMS and M-Pesa credentials later via the Integrations screens.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Creating tenant...' : 'Create Tenant'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/tenants')}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
};

export default CreateTenant;
