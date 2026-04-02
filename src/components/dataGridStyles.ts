import { alpha, Theme } from '@mui/material/styles';

export const platformDataGridSx = (theme: Theme) => ({
  border: 'none',
  backgroundColor: 'transparent',
  '--DataGrid-overlayHeight': '220px',
  '& .MuiDataGrid-main': {
    border: 'none',
  },
  '& .MuiDataGrid-columnHeaders': {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.95)}`,
    backgroundColor: alpha(theme.palette.primary.main, 0.055),
    borderRadius: theme.spacing(2),
  },
  '& .MuiDataGrid-columnHeader': {
    fontSize: 13,
    fontWeight: 700,
    color: theme.palette.text.secondary,
  },
  '& .MuiDataGrid-cell': {
    borderColor: alpha(theme.palette.divider, 0.72),
    alignItems: 'center',
  },
  '& .MuiDataGrid-row': {
    transition: 'background-color 160ms ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
    },
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
  },
  '& .MuiTablePagination-toolbar': {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    minHeight: 56,
  },
  '& .MuiDataGrid-toolbarContainer': {
    paddingInline: 0,
  },
});
