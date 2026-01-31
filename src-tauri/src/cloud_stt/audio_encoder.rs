use base64::{engine::general_purpose::STANDARD, Engine};
use hound::{SampleFormat, WavSpec, WavWriter};
use std::io::Cursor;

pub fn f32_to_wav_bytes(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, String> {
    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };

    let mut cursor = Cursor::new(Vec::new());
    let mut writer = WavWriter::new(&mut cursor, spec)
        .map_err(|e| format!("Failed to create WAV writer: {}", e))?;

    for &sample in samples {
        let sample_i16 = (sample * 32767.0).clamp(-32768.0, 32767.0) as i16;
        writer
            .write_sample(sample_i16)
            .map_err(|e| format!("Failed to write sample: {}", e))?;
    }

    writer
        .finalize()
        .map_err(|e| format!("Failed to finalize WAV: {}", e))?;

    Ok(cursor.into_inner())
}

pub fn wav_bytes_to_base64(wav_bytes: &[u8]) -> String {
    STANDARD.encode(wav_bytes)
}

pub fn f32_to_wav_base64(samples: &[f32], sample_rate: u32) -> Result<String, String> {
    let wav_bytes = f32_to_wav_bytes(samples, sample_rate)?;
    Ok(wav_bytes_to_base64(&wav_bytes))
}
