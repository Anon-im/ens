import { useTranslation } from 'react-i18next'
import { useTheme } from 'styled-components'

import { Button, Dialog } from '@ensdomains/thorin'

import { Outlink } from '@app/components/Outlink'
import { getSupportLink } from '@app/utils/supportLinks'

import { CenteredTypography } from '../components/CenteredTypography'
import { ContentContainer } from '../components/ContentContainer'
import { SkipButton } from '../components/SkipButton'
import { StyledInnerDialog } from '../components/StyledInnerDialog'

type Props = {
  onConfirm?: () => void
  onCancel?: () => void
  onSkip?: () => void
}
export const ResolverOutOfDateView = ({ onConfirm, onCancel, onSkip }: Props) => {
  const theme = useTheme()
  const { t } = useTranslation('transactionFlow')
  return (
    <>
      <Dialog.Heading
        title={t('input.profileEditor.warningOverlay.resolverOutOfDate.title')}
        alert="warning"
      />
      <StyledInnerDialog>
        <ContentContainer>
          <CenteredTypography>
            {t('input.profileEditor.warningOverlay.resolverOutOfDate.subtitle')}
          </CenteredTypography>
          <Outlink href={getSupportLink('resolver')}>
            {t('input.profileEditor.warningOverlay.action.learnMoreResolvers')}
          </Outlink>
        </ContentContainer>
        <SkipButton
          data-testid="warning-overlay-skip-button"
          description={t('input.profileEditor.warningOverlay.action.ignoreUpdate')}
          actionLabel={t('action.skip', { ns: 'common' })}
          onClick={onSkip}
        />
      </StyledInnerDialog>
      <Dialog.Footer
        leading={
          <Button
            style={{
              backgroundColor: theme.colors.backgroundSecondary,
              color: theme.colors.textSecondary,
            }}
            onClick={onCancel}
            data-testid="warning-overlay-back-button"
          >
            {t('action.cancel', { ns: 'common' })}
          </Button>
        }
        trailing={
          <Button onClick={onConfirm} data-testid="warning-overlay-next-button">
            {t('input.profileEditor.warningOverlay.action.updateResolver')}
          </Button>
        }
      />
    </>
  )
}
