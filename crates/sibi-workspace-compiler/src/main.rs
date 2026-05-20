use std::io::{self, Read};
use std::path::PathBuf;

use clap::Parser;
use serde_json::to_string_pretty;

use sibi_workspace_compiler::{
    build_adapter, compile_workspace_intent, parse_workspace_intent, CliAdapterKind, CompileError,
    LlmAdapterConfig, LlmAdapterKind,
};

#[derive(Parser)]
#[command(name = "sibi-workspace-compiler")]
struct Cli {
    #[arg(long, value_enum, default_value_t = CliAdapterKind::Fixture)]
    adapter: CliAdapterKind,
    #[arg(long)]
    fixture: Option<PathBuf>,
    #[arg(long)]
    schema: Option<PathBuf>,
    #[arg(long)]
    output: Option<PathBuf>,
    #[arg(long)]
    codex_binary: Option<String>,
}

fn main() -> Result<(), i32> {
    let cli = Cli::parse();
    let mut stdin = String::new();
    io::stdin().read_to_string(&mut stdin).map_err(|_| 1)?;

    let intent = match parse_workspace_intent(&stdin) {
        Ok(intent) => intent,
        Err(err) => {
            eprintln!("Error parseando WorkspaceIntent: {err}");
            return Err(1);
        }
    };

    let kind = match cli.adapter {
        CliAdapterKind::Fixture => LlmAdapterKind::Fixture,
        CliAdapterKind::CodexExec => LlmAdapterKind::CodexExec,
        CliAdapterKind::OpenAiApi => LlmAdapterKind::OpenAiApi,
        CliAdapterKind::Opencode => LlmAdapterKind::Opencode,
        CliAdapterKind::LocalModel => LlmAdapterKind::LocalModel,
    };

    let adapter = match build_adapter(LlmAdapterConfig {
        kind,
        fixture_path: cli.fixture.clone(),
        schema_path: cli.schema.clone(),
        codex_binary: cli.codex_binary,
    }) {
        Ok(adapter) => adapter,
        Err(err) => {
            eprintln!("Error construyendo adapter: {err}");
            return Err(1);
        }
    };

    let result = match compile_workspace_intent(&intent, adapter.as_ref()) {
        Ok(result) => result,
        Err(err) => {
            report_error(err);
            return Err(1);
        }
    };

    let rendered = to_string_pretty(&result).map_err(|_| 1)?;
    match cli.output {
        Some(path) => {
            if std::fs::write(path, rendered).is_err() {
                return Err(1);
            }
        }
        None => {
            println!("{rendered}");
        }
    }
    Ok(())
}

fn report_error(error: CompileError) {
    match error {
        CompileError::Validation(err) => {
            eprintln!("Validation failed: {err}");
        }
        other => eprintln!("{other}"),
    }
}
