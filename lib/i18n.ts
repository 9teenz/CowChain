"use client";

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en/translation.json';
import ru from '../locales/ru/translation.json';
import kk from '../locales/kk/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      kk: { translation: kk }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'kk'],
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
