import { Button as AntdButton, Modal as AntdModal } from 'antd';
import { useEffect, useState } from 'react';

import { useScreenSize } from '@/context/ScreenSizeContext';
import { LocalStorageUtils } from '@/utils';
import { GOOGLE_CONSENT_STATUS } from '@/utils/constants';

import styles from './styles.module.scss';

const updateGTag = (consentStatus: GOOGLE_CONSENT_STATUS) => {
  // @ts-ignore
  // TODO: Find out why window.gtag is not recognized
  window.gtag('consent', 'update', {
    ad_storage: consentStatus,
    ad_user_data: consentStatus,
    ad_personalization: consentStatus,
    analytics_storage: consentStatus,
    functionality_storage: consentStatus,
    personalization_storage: consentStatus,
    security_storage: consentStatus,
  });
};

const GoogleConsentBanner = () => {
  const { isDesktop } = useScreenSize();

  const [isModalVisible, setIsModalVisible] = useState(false);
  useEffect(() => {
    const status = LocalStorageUtils.getGoogleConsentStatus();
    if (status !== null) {
      updateGTag(status);
    } else {
      setIsModalVisible(true);
    }
  }, []);

  const handleAccept = () => {
    updateGTag(GOOGLE_CONSENT_STATUS.GRANTED);
    LocalStorageUtils.setGoogleConsentStatus(GOOGLE_CONSENT_STATUS.GRANTED);
    setIsModalVisible(false);
  };

  const handleDeny = () => {
    updateGTag(GOOGLE_CONSENT_STATUS.DENIED);
    LocalStorageUtils.setGoogleConsentStatus(GOOGLE_CONSENT_STATUS.DENIED);
    setIsModalVisible(false);
  };

  return (
    <AntdModal
      className={styles.modal}
      open={isModalVisible}
      title="We use cookies"
      okText={isDesktop ? 'Yes, Allow All' : 'Yes, Allow'}
      cancelText="Dismiss"
      footer={(_, { OkBtn, CancelBtn }) => (
        <>
          <AntdButton danger onClick={handleDeny}>
            {isDesktop ? 'No, Deny All' : 'No, Deny'}
          </AntdButton>
          <OkBtn />
          <CancelBtn />
        </>
      )}
      closable
      onOk={handleAccept}
      onCancel={() => setIsModalVisible(false)}
    >
      We use cookies to make your experience even better and bring you personalized content. We hope
      you&apos;re comfortable with this as it helps us enhance your visit.
    </AntdModal>
  );
};

export default GoogleConsentBanner;
