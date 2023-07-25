import { FirewallStatus } from '@linode/api-v4/lib/firewalls';
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/styles';
import * as React from 'react';

import ActionMenu, { Action } from 'src/components/ActionMenu';
import { InlineMenuAction } from 'src/components/InlineMenuAction/InlineMenuAction';
import { useGrants, useProfile } from 'src/queries/profile';

export interface ActionHandlers {
  [index: string]: any;
  triggerDeleteFirewall: (firewallID: number, firewallLabel: string) => void;
  triggerDisableFirewall: (firewallID: number, firewallLabel: string) => void;
  triggerEnableFirewall: (firewallID: number, firewallLabel: string) => void;
}

interface Props extends ActionHandlers {
  firewallID: number;
  firewallLabel: string;
  firewallStatus: FirewallStatus;
}

type CombinedProps = Props;

const FirewallActionMenu: React.FC<CombinedProps> = (props) => {
  const theme = useTheme<Theme>();
  const matchesSmDown = useMediaQuery(theme.breakpoints.down('md'));
  const { data: profile } = useProfile();
  const { data: grants } = useGrants();

  const {
    firewallID,
    firewallLabel,
    firewallStatus,
    triggerDeleteFirewall,
    triggerDisableFirewall,
    triggerEnableFirewall,
  } = props;

  const userCanModifyFirewall =
    !profile?.restricted ||
    grants?.firewall?.find((firewall) => firewall.id === firewallID)
      ?.permissions === 'read_write';

  const noPermissionTooltipText =
    "You don't have permissions to modify this Firewall.";

  const disabledProps = !userCanModifyFirewall
    ? {
        disabled: true,
        tooltip: noPermissionTooltipText,
      }
    : {};

  const actions: Action[] = [
    {
      onClick: () => {
        handleEnableDisable();
      },
      title:
        firewallStatus === ('enabled' as FirewallStatus) ? 'Disable' : 'Enable',
      ...disabledProps,
    },
    {
      onClick: () => {
        triggerDeleteFirewall(firewallID, firewallLabel);
      },
      title: 'Delete',
      ...disabledProps,
    },
  ];

  const handleEnableDisable = () => {
    const request = () =>
      firewallStatus === 'disabled'
        ? triggerEnableFirewall(firewallID, firewallLabel)
        : triggerDisableFirewall(firewallID, firewallLabel);
    request();
  };

  return (
    <>
      {!matchesSmDown &&
        actions.map((action) => {
          return (
            <InlineMenuAction
              actionText={action.title}
              disabled={action.disabled}
              key={action.title}
              onClick={action.onClick}
              tooltip={action.tooltip}
            />
          );
        })}
      {matchesSmDown && (
        <ActionMenu
          actionsList={actions}
          ariaLabel={`Action menu for Firewall ${props.firewallLabel}`}
        />
      )}
    </>
  );
};

export default React.memo(FirewallActionMenu);
