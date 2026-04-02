import { useMemo, useState } from 'react';
import {
  Alert,
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
  smsPartnerId: '',
  smsApiKey: '',
  smsShortCode: '',
  smsSupportPhone: '',
  smsChildId: '',
  mpesaShortCode: '',
  mpesaName: '',
  mpesaApiKey: '',
  mpesaPassKey: '',
  mpesaSecretKey: '',
};

const CreateTenant = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requiredConfigHelper = useMemo(
    () =>
      'This uses the existing signup contract so each tenant starts with admin access plus SMS and M-Pesa config in one step.',
    []
  );

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
      const response = await api.post<{
        tenant: {
          id: number;
          name: string;
        };
      }>('/tenants', {
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
        smsConfig: {
          partnerId: formData.smsPartnerId,
          apiKey: formData.smsApiKey,
          shortCode: formData.smsShortCode,
          customerSupportPhoneNumber: formData.smsSupportPhone,
          childId: formData.smsChildId,
        },
        mpesaConfig: {
          shortCode: formData.mpesaShortCode,
          name: formData.mpesaName,
          apiKey: formData.mpesaApiKey,
          passKey: formData.mpesaPassKey,
          secretKey: formData.mpesaSecretKey,
        },
      });

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
        subtitle="Create a tenant together with the first admin user, software billing settings, SMS config, and M-Pesa config."
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate('/tenants')}
          >
            Back To Tenants
          </Button>
        }
      />

      <Paper sx={{ p: 3 }}>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

        <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
          <Typography variant="h6">Admin User</Typography>
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
              <TextField fullWidth required type="password" label="Password" name="password" value={formData.password} onChange={handleChange} helperText="At least 6 characters" />
            </Grid>
          </Grid>

          <Typography variant="h6">Tenant Profile</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Tenant Name" name="tenantName" value={formData.tenantName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Subscription Plan" name="subscriptionPlan" value={formData.subscriptionPlan} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth required type="number" label="Monthly Charge" name="monthlyCharge" value={formData.monthlyCharge} onChange={handleChange} inputProps={{ min: 1, step: '0.01' }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth required type="number" label="Allowed Users" name="allowedUsers" value={formData.allowedUsers} onChange={handleChange} inputProps={{ min: 1, step: 1 }} />
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
              <TextField fullWidth label="Payment Details" name="paymentDetails" value={formData.paymentDetails} onChange={handleChange} />
            </Grid>
          </Grid>

          <Stack spacing={0.5}>
            <Typography variant="h6">SMS Configuration</Typography>
            <Typography variant="body2" color="text.secondary">
              {requiredConfigHelper}
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Partner ID" name="smsPartnerId" value={formData.smsPartnerId} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="API Key" name="smsApiKey" value={formData.smsApiKey} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Short Code" name="smsShortCode" value={formData.smsShortCode} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Customer Support Phone" name="smsSupportPhone" value={formData.smsSupportPhone} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Child ID" name="smsChildId" value={formData.smsChildId} onChange={handleChange} />
            </Grid>
          </Grid>

          <Stack spacing={0.5}>
            <Typography variant="h6">M-Pesa Configuration</Typography>
            <Typography variant="body2" color="text.secondary">
              Short code and display name are required. Credentials can be supplied immediately if available.
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Short Code" name="mpesaShortCode" value={formData.mpesaShortCode} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth required label="Display Name" name="mpesaName" value={formData.mpesaName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="API Key" name="mpesaApiKey" value={formData.mpesaApiKey} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Pass Key" name="mpesaPassKey" value={formData.mpesaPassKey} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Secret Key" name="mpesaSecretKey" value={formData.mpesaSecretKey} onChange={handleChange} />
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
  );
};

export default CreateTenant;
