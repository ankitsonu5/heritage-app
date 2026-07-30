// The patient's own details. Everything here came from them at registration, so
// they can correct it — except the phone, which is how they log in.

import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useChangePassword, useProfile, useUpdateProfile } from '../../api/hooks';
import Icon from '../../components/Icon';
import { ErrorState, Loading } from '../../components/States';
import { errorMessage } from '../../client';
import { useSession } from '../../store/session';
import { SweetAlert, SweetAlertState } from '../../SweetAlert';
import { Button, C, Card, Field, PasswordField, styles } from '../../theme';
import { tr } from '../../translations';

export default function ProfileScreen() {
  const { lang, signOut, voiceGuidance, setVoiceGuidance } = useSession();
  const focused = useIsFocused();

  const profile = useProfile(focused);
  const update = useUpdateProfile();
  const changePassword = useChangePassword();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');

  // Password change — no current password needed; being signed in is the proof.
  const [pwOpen, setPwOpen] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [alert, setAlert] = useState<SweetAlertState>({ visible: false, type: 'info', title: '', message: '' });

  const show = (type: SweetAlertState['type'], message: string) =>
    setAlert({ visible: true, type, title: tr(type === 'error' ? 'error' : 'success', lang), message });

  // Seed the form from the server the first time the profile lands.
  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.name ?? '');
    setAge(profile.data.age === undefined ? '' : String(profile.data.age));
    setVillage(profile.data.village ?? '');
    setAddress(profile.data.address ?? '');
  }, [profile.data]);

  if (profile.isPending) return <View style={styles.content}><Loading lang={lang} /></View>;
  if (profile.isError) {
    return (
      <View style={styles.content}>
        <ErrorState lang={lang} message={errorMessage(profile.error)} onRetry={() => profile.refetch()} />
      </View>
    );
  }

  const me = profile.data;

  const save = async () => {
    if (name.trim().length < 2) return show('warning', tr('nameRequired', lang));
    const parsedAge = Number(age);
    if (!/^\d{1,3}$/.test(age) || !Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      return show('warning', tr('validAge', lang));
    }
    if (!village.trim()) return show('warning', tr('villageRequired', lang));
    if (address.trim().length < 5) return show('warning', tr('addressRequired', lang));
    try {
      await update.mutateAsync({
        name: name.trim(), age: parsedAge,
        village: village.trim(), address: address.trim(),
      });
      setEditing(false);
      show('success', tr('profileSaved', lang));
    } catch (error) {
      show('error', errorMessage(error));
    }
  };

  const Row = ({ icon, label, value }: { icon: 'user' | 'phone' | 'home' | 'clock'; label: string; value?: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
      <View style={{
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8E8E8',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={19} color={C.red} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.muted}>{label}</Text>
        <Text style={[styles.label, { marginTop: 2 }]}>{value || '—'}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      <Text style={styles.title}>{tr('profile', lang)}</Text>

      {!editing ? (
        <>
          <Card>
            <Row icon="user" label={tr('name', lang)} value={me?.name} />
            <Row
              icon="clock"
              label={tr('age', lang)}
              value={me?.age === undefined ? undefined : `${me.age} ${tr('years', lang)}`}
            />
            <Row icon="phone" label={tr('phone', lang)} value={me?.phone ? `+91 ${me.phone}` : undefined} />
            <Row icon="home" label={tr('village', lang)} value={me?.village} />
            <Row icon="home" label={tr('address', lang)} value={me?.address} />
          </Card>

          <Button title={tr('editProfile', lang)} onPress={() => setEditing(true)} />
        </>
      ) : (
        <Card>
          <Field value={name} onChangeText={setName} placeholder={tr('name', lang)} />
          <Field
            value={age}
            onChangeText={value => setAge(value.replace(/\D/g, '').slice(0, 3))}
            keyboardType="number-pad"
            maxLength={3}
            placeholder={tr('age', lang)}
            accessibilityLabel={tr('age', lang)}
          />
          <Field value={village} onChangeText={setVillage} placeholder={tr('village', lang)} />
          <Field value={address} onChangeText={setAddress} placeholder={tr('address', lang)} multiline />
          <Text style={[styles.muted, { marginBottom: 8 }]}>{tr('phoneNotEditable', lang)}</Text>
          <Button title={tr('save', lang)} onPress={save} busy={update.isPending} />
          <Button secondary title={tr('cancel', lang)} onPress={() => setEditing(false)} />
        </Card>
      )}

      {/* Account info — what this login is, and since when. */}
      <Text style={styles.sectionTitle}>{tr('accountInfo', lang)}</Text>
      <Card>
        <View style={styles.between}>
          <Text style={styles.muted}>{tr('loginNumber', lang)}</Text>
          <Text style={styles.label}>+91 {me?.phone}</Text>
        </View>
        <View style={[styles.between, { marginTop: 10 }]}>
          <Text style={styles.muted}>{tr('memberSince', lang)}</Text>
          <Text style={styles.label}>
            {me?.createdAt ? new Date(me.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN') : '—'}
          </Text>
        </View>
      </Card>

      {/* Password — a signed-in patient can reset it without the old one. */}
      <Text style={styles.sectionTitle}>{tr('security', lang)}</Text>
      {!pwOpen ? (
        <Button secondary title={tr('changePassword', lang)} onPress={() => setPwOpen(true)} />
      ) : (
        <Card>
          <Text style={styles.label}>{tr('changePassword', lang)}</Text>
          <Text style={[styles.muted, { marginBottom: 8 }]}>{tr('noCurrentNeeded', lang)}</Text>
          <PasswordField
            value={pw1}
            onChangeText={setPw1}
            show={showPw}
            onToggleShow={() => setShowPw(v => !v)}
            placeholder={tr('newPassword', lang)}
          />
          <PasswordField
            value={pw2}
            onChangeText={setPw2}
            show={showPw}
            onToggleShow={() => setShowPw(v => !v)}
            placeholder={tr('confirmPassword', lang)}
          />
          <Button
            title={tr('save', lang)}
            busy={changePassword.isPending}
            onPress={async () => {
              if (pw1.length < 6) return show('warning', tr('weakPassword', lang));
              if (pw1 !== pw2) return show('warning', tr('passwordMismatch', lang));
              try {
                await changePassword.mutateAsync(pw1);
                setPwOpen(false); setPw1(''); setPw2('');
                show('success', tr('passwordChanged', lang));
              } catch (error) {
                show('error', errorMessage(error));
              }
            }}
          />
          <Button secondary title={tr('cancel', lang)} onPress={() => { setPwOpen(false); setPw1(''); setPw2(''); }} />
        </Card>
      )}

      {/* Same switch as the header, spelled out. */}
      <Card>
        <View style={styles.between}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{tr('voiceGuidance', lang)}</Text>
            <Text style={styles.muted}>{tr(voiceGuidance ? 'voiceOn' : 'voiceOff', lang)}</Text>
          </View>
          <Button
            compact
            secondary={!voiceGuidance}
            icon={voiceGuidance ? 'speaker' : 'speaker-off'}
            title={tr(voiceGuidance ? 'turnOff' : 'turnOn', lang)}
            onPress={() => setVoiceGuidance(!voiceGuidance)}
          />
        </View>
      </Card>

      <Button secondary icon="logout" title={tr('back', lang)} onPress={signOut} />

      <SweetAlert
        state={alert}
        confirmText={tr('ok', lang)}
        onConfirm={() => setAlert(previous => ({ ...previous, visible: false }))}
      />
    </ScrollView>
  );
}
