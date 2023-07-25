import { Config } from '@linode/api-v4';
import { useSnackbar } from 'notistack';
import React from 'react';

import ActionsPanel from 'src/components/ActionsPanel';
import { Button } from 'src/components/Button/Button';
import { ConfirmationDialog } from 'src/components/ConfirmationDialog/ConfirmationDialog';
import { Typography } from 'src/components/Typography';
import { useLinodeConfigDeleteMutation } from 'src/queries/linodes/configs';

interface Props {
  config: Config | undefined;
  linodeId: number;
  onClose: () => void;
  open: boolean;
}

export const DeleteConfigDialog = (props: Props) => {
  const { config, linodeId, onClose, open } = props;
  const { enqueueSnackbar } = useSnackbar();

  const { error, isLoading, mutateAsync } = useLinodeConfigDeleteMutation(
    linodeId,
    config?.id ?? -1
  );

  const onDelete = async () => {
    await mutateAsync();
    enqueueSnackbar('Successfully deleted config', { variant: 'success' });
    onClose();
  };

  const actions = (
    <ActionsPanel style={{ padding: 0 }}>
      <Button buttonType="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button buttonType="primary" loading={isLoading} onClick={onDelete}>
        Delete
      </Button>
    </ActionsPanel>
  );

  return (
    <ConfirmationDialog
      actions={actions}
      error={error?.[0].reason}
      onClose={onClose}
      open={open}
      title="Confirm Delete"
    >
      <Typography>
        Are you sure you want to delete &quot;{config?.label}&quot;?
      </Typography>
    </ConfirmationDialog>
  );
};
