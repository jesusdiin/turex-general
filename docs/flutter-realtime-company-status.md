# Escuchar el status de un negocio en Flutter (Supabase Realtime)

Snippet listo para copiar/pegar. Escucha cambios de `status` (`OPEN` / `CLOSED`) de **un negocio específico** usando Supabase Realtime con el `anon key`.

## 1. Dependencia

```yaml
# pubspec.yaml
dependencies:
  supabase_flutter: ^2.5.0
```

## 2. Inicialización

```dart
// main.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: '',
    anonKey: '',
  );
  runApp(const MyApp());
}

final supabase = Supabase.instance.client;
```

## 3. Listener

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class CompanyStatusListener {
  final String companyId;
  final void Function(String status, Map<String, dynamic> row) onChange;
  RealtimeChannel? _channel;

  CompanyStatusListener({required this.companyId, required this.onChange});

  void start() {
    _channel = Supabase.instance.client
        .channel('company:$companyId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'companies',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: companyId,
          ),
          callback: (payload) {
            final newRow = payload.newRecord;
            onChange(newRow['status'] as String, newRow);
          },
        )
        .subscribe();
  }

  Future<void> stop() async {
    if (_channel != null) {
      await Supabase.instance.client.removeChannel(_channel!);
      _channel = null;
    }
  }
}
```

## 4. Uso en un widget

```dart
class CompanyScreen extends StatefulWidget {
  final String companyId;
  const CompanyScreen({super.key, required this.companyId});

  @override
  State<CompanyScreen> createState() => _CompanyScreenState();
}

class _CompanyScreenState extends State<CompanyScreen> {
  late final CompanyStatusListener _listener;
  String _status = 'OPEN';

  @override
  void initState() {
    super.initState();
    _listener = CompanyStatusListener(
      companyId: widget.companyId,
      onChange: (status, _) => setState(() => _status = status),
    )..start();
  }

  @override
  void dispose() {
    _listener.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text(_status == 'OPEN' ? '🟢 Abierto' : '🔴 Cerrado'),
      ),
    );
  }
}
```

## Notas (RLS + anon)

- `OPEN → CLOSED`: el evento llega y podés actualizar el UI.
- `CLOSED → OPEN`: con `anon` puede **no** llegar (la fila "antes" no era visible para anon). Si necesitás capturar reaperturas en vivo, hacé un `select` periódico o autenticá al usuario.
- Realtime en `companies` requiere que la tabla esté en la publication `supabase_realtime` (ya configurado en la migración `0005_public_directory.sql`).
