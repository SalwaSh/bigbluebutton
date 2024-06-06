import React, { useContext, useEffect } from 'react';
import { useIntl } from 'react-intl';
import * as PluginSdk from 'bigbluebutton-html-plugin-sdk';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import { Session } from 'meteor/session';
import { formatLocaleCode } from '/imports/utils/string-utils';
import useCurrentLocale from '/imports/ui/core/local-states/useCurrentLocale';
import { LoadingContext } from '/imports/ui/components/common/loading-screen/loading-screen-HOC/component';
import { UI_DATA_LISTENER_SUBSCRIBED } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-data-hooks/consts';
import intlHolder from '/imports/ui/core/singletons/intlHolder';
import useUserChangedLocalSettings from '/imports/ui/services/settings/hooks/useUserChangedLocalSettings';

const RTL_LANGUAGES = ['ar', 'dv', 'fa', 'he'];
const LARGE_FONT_LANGUAGES = ['te', 'km'];

interface IntlAdapterProps {
  children: React.ReactNode;
}

const IntlAdapter: React.FC<IntlAdapterProps> = ({
  children,
}) => {
  const Settings = getSettingsSingletonInstance();
  const [currentLocale, setCurrentLocale] = useCurrentLocale();
  const intl = useIntl();
  const loadingContextInfo = useContext(LoadingContext);
  const setLocalSettings = useUserChangedLocalSettings();

  const DEFAULT_LANGUAGE = window.meetingClientSettings.public.app.defaultSettings.application.fallbackLocale;

  useEffect(() => {
    intlHolder.setIntl(intl);
  }, []);

  const sendUiDataToPlugins = () => {
    window.dispatchEvent(new CustomEvent(PluginSdk.IntlLocaleUiDataNames.CURRENT_LOCALE, {
      detail: {
        locale: currentLocale,
        fallbackLocale: DEFAULT_LANGUAGE,
      },
    }));
  };
  const setUp = () => {
    if (currentLocale) {
      const { language, formattedLocale } = formatLocaleCode(currentLocale);
      // @ts-ignore - JS code
      Settings.application.locale = currentLocale;
      if (RTL_LANGUAGES.includes(currentLocale.substring(0, 2))) {
        // @ts-ignore - JS code
        document.body.parentNode.setAttribute('dir', 'rtl');
        // @ts-ignore - JS code
        Settings.application.isRTL = true;
      } else {
        // @ts-ignore - JS code
        document.body.parentNode.setAttribute('dir', 'ltr');
        // @ts-ignore - JS code
        Settings.application.isRTL = false;
      }
      Session.set('isLargeFont', LARGE_FONT_LANGUAGES.includes(currentLocale.substring(0, 2)));
      document.getElementsByTagName('html')[0].lang = formattedLocale;
      document.body.classList.add(`lang-${language}`);
      Settings.save(setLocalSettings);
    }
  };
  const runOnMountAndUnmount = () => {
    window.addEventListener(
      `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.IntlLocaleUiDataNames.CURRENT_LOCALE}`,
      sendUiDataToPlugins,
    );
    // @ts-ignore - JS code
    const { locale } = Settings.application;
    if (
      typeof locale === 'string'
      && locale !== currentLocale
    ) {
      setCurrentLocale(locale);
    } else {
      setUp();
    }
    return () => {
      window.removeEventListener(
        `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.IntlLocaleUiDataNames.CURRENT_LOCALE}`,
        sendUiDataToPlugins,
      );
    };
  };

  const runOnCurrentLocaleUpdate = () => {
    setUp();
    sendUiDataToPlugins();
  };

  useEffect(runOnMountAndUnmount, []);
  useEffect(runOnCurrentLocaleUpdate, [currentLocale]);
  return !loadingContextInfo.isLoading ? children : null;
};

export default IntlAdapter;