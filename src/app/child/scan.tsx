import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../services/nav';
import { useState } from 'react';
import { ActivityIndicator, Image, TextInput, View } from 'react-native';
import { rxPhoto, type PhotoSource } from '../../services/camera';
import { canReadText, readTextFromImage } from '../../services/ocr';
import { notify } from '../../services/dialog';
import { Back, Banner, Btn, Chip, H1, Screen, T } from '../../components/ui';
import { displayName } from '../../domain/address';
import { cleanOcr, parsePrescription, SAMPLE_RX } from '../../domain/rx';
import { setRxDraft } from '../../state/drafts';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top = pos[0] === 't';
  const left = pos[1] === 'l';
  return (
    <View
      style={{
        position: 'absolute',
        width: 34,
        height: 34,
        [top ? 'top' : 'bottom']: 14,
        [left ? 'left' : 'right']: 14,
        borderColor: colors.white,
        borderTopWidth: top ? 4 : 0,
        borderBottomWidth: top ? 0 : 4,
        borderLeftWidth: left ? 4 : 0,
        borderRightWidth: left ? 0 : 4,
        borderRadius: 6,
      }}
    />
  );
}

export default function ScanRx() {
  const params = useLocalSearchParams<{ memberId?: string }>();
  const { data } = useStore();
  const [picked, setMemberId] = useState<string>();
  // Tính lúc vẽ (không giữ sẵn), để khi mở thẳng trang này lúc dữ liệu chưa tải xong vẫn chọn được người.
  const memberId = picked ?? params.memberId ?? data.members[0]?.id;
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const member = data.members.find((m) => m.id === memberId);
  const [shot, setShot] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ocr = canReadText();

  const read = (src: string, fromPhoto = false) => {
    if (!memberId) return;
    const items = parsePrescription(src);
    if (!items.length) {
      if (fromPhoto) {
        // Đọc được chữ nhưng chưa nhận ra thuốc: đưa chữ vào ô để con sửa, khỏi gõ lại từ đầu.
        setText(src);
        setTyping(true);
        notify('Chưa nhận ra tên thuốc', 'Máy đã đọc được chữ trên ảnh và đưa vào ô bên dưới. Sửa lại cho mỗi thuốc một dòng (có "mg"), rồi bấm "Đọc đơn thuốc".');
        return;
      }
      notify('Chưa thấy tên thuốc', 'Mỗi thuốc nên nằm trên một dòng, có hàm lượng (ví dụ "Amlodipine 5mg").');
      return;
    }
    setRxDraft({ memberId, items });
    router.push('/child/scan-confirm');
  };

  const scan = async (source: PhotoSource) => {
    let uri: string | undefined;
    try {
      uri = await rxPhoto(source);
    } catch {
      notify('Chưa lấy được ảnh', 'Thử chụp lại, hoặc chọn ảnh có sẵn trong máy.');
      return;
    }
    if (!uri) return;
    setShot(uri);
    setBusy(true);
    try {
      const blocks = await readTextFromImage(uri);
      const text = cleanOcr(blocks);
      if (!text.trim()) {
        notify('Chưa đọc được chữ', 'Ảnh hơi mờ hoặc tối. Chụp lại gần hơn, đủ sáng, giữ máy thẳng với tờ đơn.');
        return;
      }
      read(text, true);
    } catch {
      notify('Chưa đọc được chữ', 'Máy chưa đọc được ảnh này. Chụp lại, hoặc gõ / dán chữ trên đơn.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Back onPress={() => goBack('/child')} />
      </View>
      <H1 size={24}>Quét đơn thuốc{member ? ` của ${member.call.toLowerCase()}` : ''}</H1>
      {data.members.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {data.members.map((m) => (
            <Chip key={m.id} label={displayName(m)} on={m.id === memberId} onPress={() => setMemberId(m.id)} />
          ))}
        </View>
      )}

      {!typing ? (
        <>
          <View
            accessibilityLabel="Khung chụp đơn thuốc"
            style={{ height: 300, borderRadius: 22, backgroundColor: '#22302C', alignItems: 'center', justifyContent: 'center', padding: 30, overflow: 'hidden' }}
          >
            {!!shot && <Image source={{ uri: shot }} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: busy ? 0.5 : 1 }} />}
            {busy && <ActivityIndicator size="large" color={colors.white} style={{ position: 'absolute' }} />}
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
            {!shot && <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, gap: 6, width: '80%' }}>
              {[90, 70, 80, 55, 75].map((w, i) => (
                <View key={i} style={{ height: 8, width: `${w}%`, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' }} />
              ))}
            </View>}
          </View>
          <T size={16} color={colors.muted}>
            Đặt đơn thuốc trên mặt phẳng, đủ ánh sáng, chụp rõ cả tên thuốc và liều dùng.
          </T>
          {ocr ? (
            <>
              {busy && <T size={15} weight="600" color={colors.green}>Đang đọc chữ trên đơn...</T>}
              <Btn label={shot ? '📷 Chụp lại' : '📷 Chụp đơn thuốc'} onPress={() => void scan('camera')} disabled={!memberId || busy} />
              <Btn variant="secondary" label="Chọn ảnh đơn có sẵn" onPress={() => void scan('library')} disabled={!memberId || busy} />
              <T size={13} color={colors.muted}>Máy tự đọc chữ ngay trên điện thoại, không gửi ảnh đi đâu. Đọc xong bạn kiểm tra lại từng thuốc trước khi lưu.</T>
            </>
          ) : (
            <>
              <Banner tone="blue">
                <T size={14} color={colors.blueDark}>
                  Bản trên trình duyệt chưa đọc được chữ trên ảnh. Ở bản cài trên điện thoại, bấm “Chụp đơn thuốc” là máy tự đọc (miễn phí, không gửi ảnh đi đâu). Bây giờ có thể thử bằng đơn mẫu, hoặc gõ / dán chữ trên đơn.
                </T>
              </Banner>
              <Btn label="Thử với đơn thuốc mẫu" onPress={() => read(SAMPLE_RX)} disabled={!memberId} />
            </>
          )}
          <Btn variant={ocr ? 'ghost' : 'secondary'} label="Gõ hoặc dán chữ trên đơn" onPress={() => setTyping(true)} />
        </>
      ) : (
        <>
          <T size={15} color={colors.muted}>Mỗi thuốc một dòng, dòng dưới ghi cách uống. Ví dụ:</T>
          <View style={{ backgroundColor: colors.soft, borderRadius: 12, padding: 12 }}>
            <T size={14}>1. Amlodipine 5mg{'\n'}Sáng 1 viên, sau ăn</T>
          </View>
          <TextInput
            accessibilityLabel="Chữ trên đơn thuốc"
            multiline
            value={text}
            onChangeText={setText}
            placeholder="Gõ hoặc dán chữ trên đơn thuốc vào đây"
            placeholderTextColor={colors.muted}
            style={{ minHeight: 200, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: colors.chipLine, padding: 14, fontSize: 17, color: colors.ink, textAlignVertical: 'top' }}
          />
          <Btn label="Đọc đơn thuốc" disabled={!text.trim() || !memberId} onPress={() => read(text)} />
          <Btn variant="ghost" label="Quay lại khung chụp" onPress={() => setTyping(false)} />
        </>
      )}
    </Screen>
  );
}
